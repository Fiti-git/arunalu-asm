from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from main.models import Attendance, Employee, LeaveType, EmpLeave, Holiday, Outlet, AttendanceEditRequest, AttendanceModificationLog, AttendanceLockPeriod
from django.utils import timezone
from main.serializers import EmpLeaveSerializer, HolidaySerializer, AttendanceSerializer,EmpLeaveCreateSerializer
from django.db.models import Q
from datetime import datetime, timedelta, date
from rest_framework import status
from main.utils import verify_location
import logging
from rest_framework.views import APIView
from .face_recognition import compare_faces
from django.conf import settings
from dateutil import parser
from notifications.sms import send_sms



logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Upload validation
# ---------------------------------------------------------------------------
ALLOWED_PHOTO_MIME = {"image/jpeg", "image/jpg", "image/png"}
MAX_PHOTO_BYTES = 8 * 1024 * 1024  # 8 MiB


def _validate_photo(f):
    """Return an error-string if the uploaded photo is rejected, else None."""
    if not f:
        return "Photo is required."
    try:
        size = f.size
    except AttributeError:
        size = None
    if size is not None and size > MAX_PHOTO_BYTES:
        return f"Photo too large (max {MAX_PHOTO_BYTES // (1024 * 1024)}MiB)."
    ctype = (getattr(f, "content_type", "") or "").lower()
    if ctype and ctype not in ALLOWED_PHOTO_MIME:
        return "Photo must be a JPEG or PNG image."
    return None


def _rekognition_available():
    return bool(
        getattr(settings, "AWS_ACCESS_KEY_ID", None)
        and getattr(settings, "AWS_SECRET_ACCESS_KEY", None)
        and getattr(settings, "AWS_REKOGNITION_REGION", None)
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def punch_in(request):
    try:
        try:
            employee = request.user.employee
        except (Employee.DoesNotExist, AttributeError):
            return Response(
                {"error": "Employee profile not found for this user"},
                status=status.HTTP_403_FORBIDDEN
            )
        data = request.data

        if not all(field in data for field in ['check_in_lat', 'check_in_long']):
            return Response({"error": "Missing required location fields"}, status=status.HTTP_400_BAD_REQUEST)

        photo_err = _validate_photo(request.FILES.get('photo_check_in'))
        if photo_err:
            return Response({"error": photo_err}, status=status.HTTP_400_BAD_REQUEST)

        open_attendance = Attendance.objects.filter(
            employee=employee,
            check_out_time__isnull=True
        ).last()

        if open_attendance:
            return Response({"error": "You must punch out from your previous session before punching in again"}, status=400)
        
        try:
            check_in_lat = float(data.get('check_in_lat'))
            check_in_long = float(data.get('check_in_long'))
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid latitude or longitude"},
                status=status.HTTP_400_BAD_REQUEST
            )

        photo_file = request.FILES.get('photo_check_in')

        if not verify_location(employee, check_in_lat, check_in_long):
            return Response(
                {"error": "You're not at an allowed location for punch-in"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        verified_status = 'Pending'
        response_message = "Punch-in recorded successfully!"

        if not employee.reference_photo:
            employee.reference_photo = photo_file
            employee.punchin_selfie = photo_file
            employee.save()
            
            verified_status = 'Pending'
            response_message = "Punch-in recorded. Your photo has been submitted for verification."

        elif employee.reference_photo:
            employee.punchin_selfie = photo_file
            employee.save()

            if not _rekognition_available():
                # AWS not configured: accept punch but flag for manual review
                verified_status = 'Pending'
                response_message = (
                    "Punch-in recorded. Face verification service is unavailable; "
                    "your record will be reviewed manually."
                )
            else:
                try:
                    employee.reference_photo.open('rb')
                    employee.punchin_selfie.open('rb')
                    source_bytes = employee.reference_photo.read()
                    target_bytes = employee.punchin_selfie.read()
                    employee.reference_photo.close()
                    employee.punchin_selfie.close()

                    result = compare_faces(
                        source_bytes=source_bytes,
                        target_bytes=target_bytes,
                        aws_access_key=settings.AWS_ACCESS_KEY_ID,
                        aws_secret_key=settings.AWS_SECRET_ACCESS_KEY,
                        aws_region=settings.AWS_REKOGNITION_REGION
                    )

                    if result.get('FaceMatches'):
                        verified_status = 'Verified'
                    else:
                        return Response({"error": "Face recognition failed. Please try again."}, status=status.HTTP_400_BAD_REQUEST)

                except (OSError, ValueError) as e:
                    logger.error(f"Face image read error for employee {employee.employee_id}: {e}")
                    return Response({"error": "Could not process image. Ensure your face is clearly visible."}, status=status.HTTP_400_BAD_REQUEST)
                except Exception as e:
                    # Rekognition/network outage — degrade gracefully
                    logger.exception(f"Rekognition unavailable for employee {employee.employee_id}: {e}")
                    verified_status = 'Pending'
                    response_message = (
                        "Punch-in recorded. Face verification service is unavailable; "
                        "your record will be reviewed manually."
                    )

        # Check if the employee has an approved leave on the punch-in date
        leave_record = EmpLeave.objects.filter(
            employee=employee,
            leave_date=timezone.now().date(),
            status='approved'
        ).first()

        if leave_record:
            # Update the leave status to 'rejected' and add a remark
            leave_record.status = 'rejected'
            leave_record.remarks = f"Employee punched in on an approved leave day: {timezone.now().date()}"
            leave_record.save()

            # Notify the reason for rejection
            response_message = "Punch-in recorded. Leave for this day has been rejected."

        # Create the attendance record
        attendance = Attendance.objects.create(
            employee=employee,
            date=timezone.now().date(),
            check_in_time=timezone.now(),
            check_in_lat=check_in_lat,
            check_in_long=check_in_long,
            punchin_verification=verified_status
        )

        return Response({
            "message": response_message,
            "data": AttendanceSerializer(attendance).data,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Punch-in error: {str(e)}", exc_info=True)
        return Response({"error": "An unexpected error occurred during punch-in"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def punch_out(request):
    try:
        try:
            employee = request.user.employee
        except (Employee.DoesNotExist, AttributeError):
            return Response(
                {"error": "Employee profile not found for this user"},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data

        # 1. Validate location fields
        if not all(field in data for field in ['check_out_lat', 'check_out_long']):
            return Response({"error": "Missing required location fields"}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Validate photo (size + MIME)
        photo_file = request.FILES.get('photo_check_out')
        photo_err = _validate_photo(photo_file)
        if photo_err:
            return Response({"error": photo_err}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Check active attendance
        attendance = Attendance.objects.filter(
            employee=employee,
            check_out_time__isnull=True
        ).last()

        if not attendance:
            return Response({"error": "No active punch-in session found"}, status=400)

        # 4. Prevent accidental reference photo override
        if not employee.reference_photo:
            return Response({"error": "Reference photo missing. Contact admin."}, status=400)

        # 5. Parse location
        try:
            check_out_lat = float(data.get('check_out_lat'))
            check_out_long = float(data.get('check_out_long'))
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid latitude or longitude"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 6. Verify location
        if not verify_location(employee, check_out_lat, check_out_long):
            return Response(
                {"error": "You're not at an allowed location for punch-out"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 7. Face recognition BEFORE saving selfie
        punchout_verification = "Verified"
        if not _rekognition_available():
            # AWS not configured — accept but mark for manual review
            punchout_verification = "Pending"
        else:
            try:
                employee.reference_photo.open('rb')
                source_bytes = employee.reference_photo.read()
                employee.reference_photo.close()

                target_bytes = photo_file.read()  # Read directly without saving first

                result = compare_faces(
                    source_bytes=source_bytes,
                    target_bytes=target_bytes,
                    aws_access_key=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_key=settings.AWS_SECRET_ACCESS_KEY,
                    aws_region=settings.AWS_REKOGNITION_REGION
                )

                if not result.get('FaceMatches'):
                    return Response({"error": "Face recognition failed. Please try again."}, status=401)

            except (OSError, ValueError) as e:
                logger.error(f"Face image read error during punch-out for employee {employee.employee_id}: {e}")
                return Response({"error": "Could not process image. Ensure your face is clearly visible."}, status=400)
            except Exception as e:
                # Rekognition/network outage — degrade gracefully
                logger.exception(f"Rekognition unavailable during punch-out for employee {employee.employee_id}: {e}")
                punchout_verification = "Pending"
            finally:
                # Ensure the uploaded stream can still be saved to storage
                try:
                    photo_file.seek(0)
                except (AttributeError, OSError):
                    pass

        # 8. Only save selfie AFTER verification passes (or was skipped/degraded)
        employee.punchout_selfie = photo_file
        employee.save()

        # 9. Save attendance details
        attendance.check_out_time = timezone.now()
        attendance.check_out_lat = check_out_lat
        attendance.check_out_long = check_out_long
        attendance.punchout_verification = punchout_verification
        attendance.save()

        return Response({
            "message": "Punch-out recorded successfully!",
            "data": AttendanceSerializer(attendance).data
        }, status=200)

    except Exception as e:
        logger.error(f"Punch-out error: {str(e)}", exc_info=True)
        return Response({"error": "An error occurred during punch-out"}, status=500)


from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

# GET /attendance/me - Get logged-in user's attendance
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_attendance(request):
    from main.active_periods import filter_qs_by_active_periods
    employee = request.user.employee
    attendance = filter_qs_by_active_periods(
        Attendance.objects.filter(employee=employee), employee_field='employee', date_field='date'
    ).order_by('-date')
    
    data = [{
        'date': att.date,
        'check_in_time': att.check_in_time,
        'check_out_time': att.check_out_time,
        'status': att.status,
        'worked_hours': att.worked_hours,
        'ot_hours': att.ot_hours,
    } for att in attendance]

    return Response(data)


# GET /attendance/outlet - Get attendance for outlet staff (Manager)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_outlet_attendance(request):
    employee = request.user.employee
    if not request.user.groups.filter(name="Manager").exists(): 
        return Response({"message": "You are not authorized to view this information."}, status=403)
    
    from main.active_periods import filter_qs_by_active_periods
    outlet_staff = Employee.objects.filter(outlets__in=employee.outlets.all()).distinct()
    attendance = filter_qs_by_active_periods(
        Attendance.objects.filter(employee__in=outlet_staff), employee_field='employee', date_field='date'
    ).order_by('-date')

    data = [{
        'employee': att.employee.fullname,
        'date': att.date,
        'check_in_time': att.check_in_time,
        'check_out_time': att.check_out_time,
        'status': att.status,
        'worked_hours': att.worked_hours,
    } for att in attendance]

    return Response(data)


# GET /attendance/all - Get all attendance records (Admin)
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_all_attendance(request):
    from main.active_periods import filter_qs_by_active_periods
    attendance = filter_qs_by_active_periods(
        Attendance.objects.all(), employee_field='employee', date_field='date'
    ).order_by('-date')

    data = [{
        'employee': att.employee.fullname,
        'date': att.date,
        'check_in_time': att.check_in_time,
        'check_out_time': att.check_out_time,
        'status': att.status,
        'worked_hours': att.worked_hours,
    } for att in attendance]

    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_attendance(request):
    """
    Update check-in and/or check-out times of an attendance record.
    Recalculate worked hours, status, OT hours, and add verification notes.
    """
    data = request.data
    attendance_id = data.get('attendance_id')
    new_check_in = data.get('check_in_time')
    new_check_out = data.get('check_out_time')

    if not attendance_id:
        return Response({"error": "attendance_id is required."},
                        status=status.HTTP_400_BAD_REQUEST)
    
    try:
        attendance = Attendance.objects.get(attendance_id=attendance_id)
    except Attendance.DoesNotExist:
        return Response({"error": "Attendance record not found."},
                        status=status.HTTP_404_NOT_FOUND)
    
    notes = attendance.verification_notes or {}

    # Update check-in time if provided
    if new_check_in:
        try:
            check_in_dt = parser.parse(new_check_in)

            # Preserve the first-ever original time if already recorded
            if 'checkin_update' in notes and 'Original_check_in_time' in notes['checkin_update']:
                original_check_in_time = notes['checkin_update']['Original_check_in_time']
            else:
                original_check_in_time = str(attendance.check_in_time) if attendance.check_in_time else None

            attendance.check_in_time = check_in_dt

            notes['checkin_update'] = {
                "updated_by": request.user.username,
                "Original_check_in_time": original_check_in_time,
                "check_in_time": str(check_in_dt),
                "updated_at": timezone.now().isoformat()
            }

            attendance.punchin_verification = 'Verified'
        except Exception as e:
            return Response({"error": f"Invalid check_in_time format: {str(e)}"},
                            status=status.HTTP_400_BAD_REQUEST)

    # Update check-out time if provided
    if new_check_out:
        try:
            check_out_dt = parser.parse(new_check_out)

            # Preserve the first-ever original time if already recorded
            if 'checkout_update' in notes and 'Original_check_out_time' in notes['checkout_update']:
                original_check_out_time = notes['checkout_update']['Original_check_out_time']
            else:
                original_check_out_time = str(attendance.check_out_time) if attendance.check_out_time else None

            attendance.check_out_time = check_out_dt

            notes['checkout_update'] = {
                "updated_by": request.user.username,
                "Original_check_out_time": original_check_out_time,
                "check_out_time": str(check_out_dt),
                "updated_at": timezone.now().isoformat()
            }

            attendance.punchout_verification = 'Verified'
        except Exception as e:
            return Response({"error": f"Invalid check_out_time format: {str(e)}"},
                            status=status.HTTP_400_BAD_REQUEST)

    # Recalculate worked hours, OT hours, and status if both times exist
    if attendance.check_in_time and attendance.check_out_time:
        delta = attendance.check_out_time - attendance.check_in_time
        attendance.worked_hours = round(delta.total_seconds() / 3600, 2)
        if attendance.worked_hours < 4:
            attendance.status = 'Half Day'
        elif attendance.worked_hours > 8:
            attendance.ot_hours = attendance.worked_hours - 8
            attendance.status = 'Present'
        else:
            attendance.ot_hours = 0
            attendance.status = 'Present'

    attendance.verification_notes = notes
    attendance.save()

    return Response({
        "message": "Attendance updated successfully",
        "attendance_id": attendance.attendance_id,
        "worked_hours": attendance.worked_hours,
        "ot_hours": attendance.ot_hours,
        "status": attendance.status,
        "verification_notes": attendance.verification_notes
    })

# GET /attendance/{id} - View specific attendance record
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attendance(request, id):
    try:
        attendance = Attendance.objects.get(attendance_id=id)
    except Attendance.DoesNotExist:
        return Response({"message": "Attendance record not found."}, status=404)

    data = {
        'employee': attendance.employee.fullname,
        'date': attendance.date,
        'check_in_time': attendance.check_in_time,
        'check_out_time': attendance.check_out_time,
        'status': attendance.status,
        'worked_hours': attendance.worked_hours,
        'ot_hours': attendance.ot_hours,
    }

    return Response(data)


# PUT /attendance/{id}/status - Mark or update attendance status (Manager/Admin)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_attendance_status(request, id):
    try:
        attendance = Attendance.objects.get(attendance_id=id)
    except Attendance.DoesNotExist:
        return Response({"message": "Attendance record not found."}, status=404)

    if not (request.user.groups.filter(name="Manager").exists()):
        return Response({"message": "You are not authorized to update the status."}, status=403)

    status = request.data.get('status')
    if status not in ['Present', 'Late', 'Absent']:
        return Response({"message": "Invalid status."}, status=400)

    attendance.status = status
    attendance.save()

    return Response({"message": "Attendance status updated."}, status=200)

class LeaveRequestAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            employee = user.employee
        except (Employee.DoesNotExist, AttributeError):
            return Response({'error': 'Employee profile not found for this user.'},
                            status=status.HTTP_403_FORBIDDEN)

        leave_type_id = request.data.get('leave_type')
        leave_dates = request.data.get('leave_dates')
        remarks = request.data.get('remarks', '')

        if not leave_type_id or not leave_dates:
            return Response({'error': 'leave_type and leave_dates are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            leave_type = LeaveType.objects.get(id=leave_type_id)
        except LeaveType.DoesNotExist:
            return Response({'error': 'Invalid leave_type.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        max_future = today + timedelta(days=180)

        # Parse & validate all dates first so we don't create partial rows
        parsed = []
        for date_str in leave_dates:
            try:
                ld = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({'error': f'Invalid date format: {date_str}'}, status=status.HTTP_400_BAD_REQUEST)
            if ld < today:
                return Response(
                    {'error': f'Leave date {ld} is in the past. Retroactive leaves must be entered by an admin.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if ld > max_future:
                return Response(
                    {'error': f'Leave date {ld} is more than 180 days in the future.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            parsed.append(ld)

        created = []
        for leave_date in parsed:
            obj = EmpLeave.objects.create(
                employee=employee,
                leave_date=leave_date,
                leave_type=leave_type,
                remarks=remarks,
                status='pending'
            )
            created.append(obj.leave_refno)

        return Response({'message': 'Leave requests submitted.', 'created_ids': created}, status=status.HTTP_201_CREATED)
    
@api_view(['GET'])
def my_leave_requests(request):
    if request.method == 'GET':
        leave_requests = EmpLeave.objects.filter(employee=request.user.employee)
        serializer = EmpLeaveSerializer(leave_requests, many=True)
        return Response(serializer.data)
    
@api_view(['GET'])
def all_leave_requests(request):
    leave_requests = EmpLeave.objects.all()
    serializer = EmpLeaveSerializer(leave_requests, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def leave_requests_by_outlet(request):
    user = request.user

    # Check if user is a manager
    if not user.groups.filter(name="Manager").exists():
        return Response({"detail": "Access denied. User is not a manager."}, status=403)

    outlet_id = request.query_params.get('outlet_id')
    if not outlet_id:
        return Response({"detail": "Missing outlet_id parameter."}, status=400)

    try:
        outlet_id = int(outlet_id)
    except ValueError:
        return Response({"detail": "Invalid outlet_id."}, status=400)

    # Check user has an employee profile
    employee = getattr(user, 'employee', None)
    if not employee:
        return Response({"detail": "Employee profile not found."}, status=404)

    # Check outlet access
    if not employee.outlets.filter(id=outlet_id).exists():
        return Response({"detail": "You are not assigned to this outlet."}, status=403)

    # Filter leave requests for employees in that outlet
    leave_requests = EmpLeave.objects.filter(employee__outlets__id=outlet_id).distinct()
    serializer = EmpLeaveSerializer(leave_requests, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_leave_requests(request):
    user = request.user
    employee = user.employee

    today = date.today()
    result = []

    # Fetch all active leave types
    leave_types = LeaveType.objects.filter(active=True)

    for leave_type in leave_types:
        # Get the year range from leave type
        start_date = leave_type.year_start_date
        end_date = leave_type.year_end_date

        # Get count of used leaves (pending + approved) in the year range
        used_count = EmpLeave.objects.filter(
            employee=employee,
            leave_type=leave_type,
            status__in=['pending', 'approved'],
            leave_date__range=(start_date, end_date)
        ).count()

        allowed = leave_type.att_type_no_of_days_in_year
        remaining = max(allowed - used_count, 0)

        result.append({
            'id': leave_type.id,
            'leave_type': leave_type.att_type_name,
            'leave_code': leave_type.att_type,
            'allowed': allowed,
            'used': used_count,
            'remaining': remaining
        })

    return Response(result)

@api_view(['PUT'])
def update_leave_status(request, id):
    try:
        leave_request = EmpLeave.objects.select_related('employee__user').prefetch_related('employee__outlets').get(leave_refno=id)
    except EmpLeave.DoesNotExist:
        return Response({"message": "Leave request not found."}, status=404)

    user = request.user

    is_admin = user.is_staff or user.is_superuser
    is_manager = user.groups.filter(name="Manager").exists()
    same_outlet = (
        hasattr(user, 'employee') and
        leave_request.employee.outlets.filter(id__in=user.employee.outlets.values_list('id', flat=True)).exists()
    )


    if not (is_admin or (is_manager and same_outlet)):
        return Response({"message": "You are not authorized to update this leave request."}, status=403)

    new_status = request.data.get('status')

    if new_status not in ['approved', 'rejected']:
        return Response({"message": "Invalid status. Must be 'approved' or 'rejected'."}, status=400)

    leave_request.status = new_status
    leave_request.action_date = timezone.now().date()
    leave_request.action_user = user
    leave_request.save()

    phone = leave_request.employee.phone_number
    if phone:
        verb = 'approved' if new_status == 'approved' else 'rejected'
        leave_date = leave_request.date.strftime('%Y-%m-%d') if leave_request.date else ''
        msg = (
            f"Hi {leave_request.employee.fullname}, your leave on {leave_date} "
            f"has been {verb}. - Arunalu ASM"
        )
        try:
            send_sms(phone=phone, message=msg, event=f'leave_{verb}')
        except Exception:
            logger.exception('Failed to send leave status SMS')

    return Response({"message": f"Leave request {new_status}."}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_holidays(request):
    holidays = Holiday.objects.all()
    serializer = HolidaySerializer(holidays, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_holiday(request):
    if not (request.user.groups.filter(name="Manager").exists()):
        return Response({"detail": "Not authorized."}, status=403)

    serializer = HolidaySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_holiday(request, hcode):
    if not (request.user.groups.filter(name="Admin").exists()):
        return Response({"detail": "Not authorized."}, status=403)

    holiday = Holiday.objects.filter(hcode=hcode).first()
    if not holiday:
        return Response({"detail": "Holiday not found."}, status=404)
    
    serializer = HolidaySerializer(holiday, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_holiday(request, hcode):
    if not (request.user.groups.filter(name="Admin").exists()):
        return Response({"detail": "Not authorized."}, status=403)

    holiday = Holiday.objects.filter(hcode=hcode).first()
    if not holiday:
        return Response({"detail": "Holiday not found."}, status=404)
    holiday.delete()
    return Response({"message": "Holiday deleted."}, status=204)


@api_view(['GET'])
def generate_report(request):
    # Required date range
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date') or start_date_str

    # Optional filters
    user_id = request.GET.get('user_id')
    outlet = request.GET.get('outlet')  # Assuming outlet is a field in Employee

    if not start_date_str:
        return Response({"detail": "start_date is required."}, status=400)

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except ValueError:
        return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400)

    # Filter employees
    employees = Employee.objects.all()
    if user_id:
        employees = employees.filter(id=user_id)
    if outlet:
        employees = employees.filter(outlets=outlet)

    report = []

    # Loop through each day and employee — skip days when employee was inactive
    from main.active_periods import is_active_on
    current_date = start_date
    while current_date <= end_date:
        for employee in employees:
            if not is_active_on(employee, current_date):
                continue
            attendance = Attendance.objects.filter(employee=employee, date=current_date).first()
            leave = None if attendance else EmpLeave.objects.filter(
                employee=employee, leave_date=current_date, leave_status="Approved"
            ).first()
            holiday = Holiday.objects.filter(hdate=current_date).first()

            row = {
                "emp_id": employee.emp_id,
                "designation": employee.role.designation if hasattr(employee, 'role') else '',
                "id_no": employee.id_no,
                "name": employee.name,
                "date": current_date,
                "time_in": attendance.time_in if attendance else '',
                "time_out": attendance.time_out if attendance else '',
                "type": (
                    'WD' if attendance else
                    (leave.leave_type if leave else '')
                ),
                "type_name": (
                    "" if attendance else
                    (leave.leave_type if leave else '')
                ),
                "hcode": holiday.hcode if holiday else '',
                "htype": holiday.holiday_type if holiday else '',
                "hname": holiday.holiday_name if holiday else '',
                "agency": employee.agency
            }

            report.append(row)
        current_date += timedelta(days=1)

    return Response(report)


class VerifyAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        
        # --- Permission Check: Ensure user is a Manager or Admin ---
        if not (user.is_staff or user.groups.filter(name="Manager").exists()):
            return Response(
                {"error": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # --- Input Validation ---
        attendance_id = request.data.get('attendance_id')
        verification_type = request.data.get('verification_type') # Expected: 'punchin' or 'punchout'
        new_status = request.data.get('status') # Expected: 'Verified' or 'Rejected'
        notes = request.data.get('notes', '') # Optional notes

        if not all([attendance_id, verification_type, new_status]):
            return Response(
                {"error": "attendance_id, verification_type, and status are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if verification_type not in ['punchin', 'punchout']:
            return Response({"error": "verification_type must be 'punchin' or 'punchout'."}, status=status.HTTP_400_BAD_REQUEST)
            
        if new_status not in ['Verified', 'Rejected']:
            return Response({"error": "status must be 'Verified' or 'Rejected'."}, status=status.HTTP_400_BAD_REQUEST)
            
        # --- Database Update ---
        try:
            attendance = Attendance.objects.select_related('employee').get(attendance_id=attendance_id)
            
            # Security Check: Can this manager see this employee?
            if user.groups.filter(name="Manager").exists():
                manager_outlets = user.employee.outlets.all()
                if not attendance.employee.outlets.filter(id__in=manager_outlets.values_list('id', flat=True)).exists():
                    return Response({"error": "You are not authorized to verify this employee's attendance."}, status=status.HTTP_403_FORBIDDEN)

            # Update the correct field
            if verification_type == 'punchin':
                attendance.punchin_verification = new_status
            else: # 'punchout'
                attendance.punchout_verification = new_status
            
            if notes:
                attendance.verification_notes = notes
                
            attendance.save()
            
            # Return the updated record
            serializer = AttendanceSerializer(attendance)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Attendance.DoesNotExist:
            return Response({"error": "Attendance record not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_leave(request):
    serializer = EmpLeaveCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        employee = serializer.validated_data['employee']
        leave_date = serializer.validated_data['leave_date']

        # Check for existing leave with status 'pending' or 'approved' for the same employee on leave_date
        existing = EmpLeave.objects.filter(
            employee=employee,
            leave_date=leave_date,
            status__in=['pending', 'approved']
        ).exists()

        if existing:
            return Response({
                "success": False, 
                "error": "A leave with status 'pending' or 'approved' already exists for this employee on the selected date."
            }, status=400)

        # Save leave
        leave = serializer.save(
            status='pending',
            action_user=request.user,
            action_date=None
        )
        return Response({
            "success": True,
            "leave_refno": leave.leave_refno
        })

    else:
        return Response({"success": False, "errors": serializer.errors}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_add_attendance(request):
    """ 
    Adds or updates attendance for multiple employees using a single outlet's location. 
    If the employee has an approved leave on the given date, attendance is not added.
    """
    data = request.data
    employee_ids = data.get('employee_ids')
    date_str = data.get('date')
    check_in_str = data.get('check_in_time')
    check_out_str = data.get('check_out_time')
    outlet_id = data.get('outlet_id')  # Expecting outlet_id from frontend

    # --- Validation ---
    if not all([employee_ids, date_str, check_in_str, check_out_str, outlet_id]):
        return Response(
            {"error": "employee_ids, outlet_id, date, check_in_time, and check_out_time are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # --- Get Outlet Location ---
    try:
        outlet = Outlet.objects.get(id=outlet_id)
        if not outlet.latitude or not outlet.longitude:
            return Response(
                {"error": "The selected outlet does not have location data."},
                status=status.HTTP_400_BAD_REQUEST
            )
        outlet_lat = outlet.latitude
        outlet_long = outlet.longitude
    except Outlet.DoesNotExist:
        return Response({"error": "Outlet not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        attendance_date = parser.parse(date_str).date()
        check_in_dt = parser.parse(f"{date_str}T{check_in_str}")
        check_out_dt = parser.parse(f"{date_str}T{check_out_str}")
    except (ValueError, TypeError):
        return Response(
            {"error": "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # --- Processing ---
    successful_updates = []
    failed_updates = []
    leave_updates = []  # To store employees who have approved leave on the given day

    delta = check_out_dt - check_in_dt
    worked_hours = round(delta.total_seconds() / 3600, 2)
    ot_hours = max(0, worked_hours - 8)
    status_val = 'Present' if worked_hours >= 4 else 'Half Day'

    notes = {
        'manual_bulk_add': {
            "updated_by": request.user.username,
            "updated_at": timezone.now().isoformat()
        }
    }

    # Find which employees exist from the provided list
    existing_employees = Employee.objects.filter(employee_id__in=employee_ids)
    existing_employee_ids = {emp.employee_id for emp in existing_employees}

    # Determine which IDs were not found
    for emp_id in employee_ids:
        if emp_id not in existing_employee_ids:
            failed_updates.append({"employee_id": emp_id, "error": "Employee not found."})

    # Process only the employees that were found
    for employee in existing_employees:
        # Check if the employee has an approved leave on the attendance date
        leave_exists = EmpLeave.objects.filter(
            employee=employee,
            leave_date=attendance_date,
            status='approved'
        ).exists()

        if leave_exists:
            leave_updates.append({
                "employee_id": employee.employee_id,
                "error": "Employee has an approved leave on this date."
            })
            continue  # Skip attendance creation for this employee

        try:
            Attendance.objects.update_or_create(
                employee=employee,
                date=attendance_date,
                defaults={
                    'check_in_time': check_in_dt,
                    'check_out_time': check_out_dt,
                    'worked_hours': worked_hours,
                    'ot_hours': ot_hours,
                    'status': status_val,
                    'check_in_lat': outlet_lat,
                    'check_in_long': outlet_long,
                    'check_out_lat': outlet_lat,
                    'check_out_long': outlet_long,
                    'punchin_verification': 'Verified',
                    'punchout_verification': 'Verified',
                    'verification_notes': notes
                }
            )
            successful_updates.append(employee.employee_id)
        except Exception as e:
            failed_updates.append({"employee_id": employee.employee_id, "error": str(e)})

    return Response({
        "message": f"Bulk operation completed. {len(successful_updates)} records processed.",
        "successful_updates": successful_updates,
        "failed_updates": failed_updates,
        "leave_updates": leave_updates  # Include employees with approved leaves
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_add_leave(request):
    """
    Adds leave records for multiple employees for a single date.
    Skips any employee who already has a pending or approved leave on that date.
    Sets the status to 'approved' as this is a direct admin/manager action.
    """
    data = request.data
    employee_ids = data.get('employee_ids')
    leave_date_str = data.get('leave_date')
    leave_type_id = data.get('leave_type')
    remarks = data.get('remarks', '') # Remarks are optional

    # --- Validation ---
    if not all([employee_ids, leave_date_str, leave_type_id]):
        return Response(
            {"error": "employee_ids, leave_date, and leave_type are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        leave_date = parser.parse(leave_date_str).date()
        leave_type = LeaveType.objects.get(id=leave_type_id)
    except (ValueError, TypeError):
        return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
    except LeaveType.DoesNotExist:
        return Response({"error": "LeaveType not found."}, status=status.HTTP_404_NOT_FOUND)

    # --- Processing ---
    successful_adds = []
    failed_adds = []
    
    # Fetch all employees to process
    employees_to_process = Employee.objects.filter(employee_id__in=employee_ids)
    
    # Get a set of (employee_id, leave_date) for existing leaves to check for duplicates efficiently
    existing_leaves = EmpLeave.objects.filter(
        employee_id__in=employee_ids,
        leave_date=leave_date,
        status__in=['pending', 'approved']
    ).values_list('employee_id', flat=True)
    existing_leave_set = set(existing_leaves)

    for employee in employees_to_process:
        if employee.employee_id in existing_leave_set:
            failed_adds.append({
                "employee_id": employee.employee_id,
                "error": "An active leave already exists for this date."
            })
            continue

        try:
            EmpLeave.objects.create(
                employee=employee,
                leave_date=leave_date,
                leave_type=leave_type,
                remarks=remarks,
                status='approved',  # Approve directly since it's a manual add
                action_user=request.user,
                action_date=timezone.now()
            )
            successful_adds.append(employee.employee_id)
        except Exception as e:
            failed_adds.append({"employee_id": employee.employee_id, "error": str(e)})

    return Response({
        "message": f"Bulk leave operation completed. {len(successful_adds)} leaves added.",
        "successful_adds": successful_adds,
        "failed_adds": failed_adds
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_add_leave_v2(request):
    """
    Admin/manager adds leave for multiple employees across multiple dates.
    Blocks insertion if:
      - An active (pending/approved) leave already exists for that (employee, date)
      - The employee has a check_in_time recorded for that date (they punched in)
    Created leaves are set to status='approved'.
    """
    data = request.data
    employee_ids = data.get('employee_ids') or []
    leave_dates_raw = data.get('leave_dates') or []
    leave_type_id = data.get('leave_type')
    remarks = (data.get('remarks') or '').strip()

    if not employee_ids or not leave_dates_raw or not leave_type_id:
        return Response(
            {"error": "employee_ids, leave_dates, and leave_type are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user

    try:
        leave_type = LeaveType.objects.get(id=leave_type_id)
    except LeaveType.DoesNotExist:
        return Response({"error": "LeaveType not found."}, status=status.HTTP_404_NOT_FOUND)

    # Parse and de-dup dates
    leave_dates = []
    for d in leave_dates_raw:
        try:
            leave_dates.append(parser.parse(str(d)).date())
        except (ValueError, TypeError):
            return Response(
                {"error": f"Invalid date: {d}. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    leave_dates = sorted(set(leave_dates))

    employees = list(Employee.objects.filter(employee_id__in=employee_ids))
    employees_by_id = {e.employee_id: e for e in employees}

    # Pre-fetch: existing active leaves for these (employee, date) pairs
    existing_leaves = set(
        EmpLeave.objects
        .filter(employee_id__in=employee_ids, leave_date__in=leave_dates, status__in=['pending', 'approved'])
        .values_list('employee_id', 'leave_date')
    )

    # Pre-fetch: attendance records with a check-in for those (employee, date) pairs
    punched_in = set(
        Attendance.objects
        .filter(employee_id__in=employee_ids, date__in=leave_dates)
        .exclude(check_in_time__isnull=True)
        .values_list('employee_id', 'date')
    )

    successful = []  # list of {employee_id, leave_date, leave_refno}
    skipped = []    # list of {employee_id, leave_date, reason}

    for emp_id in employee_ids:
        emp = employees_by_id.get(int(emp_id)) if str(emp_id).isdigit() else employees_by_id.get(emp_id)
        if not emp:
            for d in leave_dates:
                skipped.append({
                    "employee_id": emp_id,
                    "leave_date": str(d),
                    "reason": "Employee not found.",
                })
            continue

        for d in leave_dates:
            key = (emp.employee_id, d)
            if key in existing_leaves:
                skipped.append({
                    "employee_id": emp.employee_id,
                    "leave_date": str(d),
                    "reason": "Active leave already exists for this date.",
                })
                continue
            if key in punched_in:
                skipped.append({
                    "employee_id": emp.employee_id,
                    "leave_date": str(d),
                    "reason": "Employee already punched in on this date.",
                })
                continue
            try:
                leave = EmpLeave.objects.create(
                    employee=emp,
                    leave_date=d,
                    leave_type=leave_type,
                    remarks=remarks,
                    status='approved',
                    action_user=user,
                    action_date=timezone.now(),
                )
                successful.append({
                    "employee_id": emp.employee_id,
                    "leave_date": str(d),
                    "leave_refno": leave.leave_refno,
                })
            except Exception as e:
                skipped.append({
                    "employee_id": emp.employee_id,
                    "leave_date": str(d),
                    "reason": str(e),
                })

    return Response({
        "message": f"{len(successful)} added, {len(skipped)} skipped.",
        "successful": successful,
        "skipped": skipped,
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_leave(request, id):
    """Delete a single leave record. Admin or same-outlet manager only."""
    try:
        leave = EmpLeave.objects.select_related('employee').get(leave_refno=id)
    except EmpLeave.DoesNotExist:
        return Response({"error": "Leave not found."}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    is_admin = user.is_staff or user.is_superuser
    if not is_admin:
        emp = getattr(user, 'employee', None)
        manager_outlet_ids = list(emp.outlets.values_list('id', flat=True)) if emp else []
        target_outlet_id = leave.employee.primary_outlet_id
        if not emp or target_outlet_id not in manager_outlet_ids:
            return Response({"error": "You are not authorized to delete this leave."}, status=status.HTTP_403_FORBIDDEN)

    leave.delete()
    return Response({"message": "Leave deleted."}, status=status.HTTP_200_OK)


# =============================================================================
# V2 ATTENDANCE APIs — new endpoints for the rebuilt system
# Old /api/attendance/... endpoints remain untouched above
# =============================================================================

LOCK_DAYS = 45  # Records older than this many days are locked for direct editing


def _is_locked(record_date):
    """Return True if the attendance date is >= LOCK_DAYS days ago."""
    cutoff = date.today() - timedelta(days=LOCK_DAYS)
    return record_date <= cutoff


def _recalculate_attendance(attendance):
    """Recalculate worked_hours, ot_hours, and status from check_in/out times."""
    if attendance.check_in_time and attendance.check_out_time:
        delta = attendance.check_out_time - attendance.check_in_time
        attendance.worked_hours = round(delta.total_seconds() / 3600, 2)
        if attendance.worked_hours < 4:
            attendance.status = 'Half Day'
        elif attendance.worked_hours > 8:
            attendance.ot_hours = attendance.worked_hours - 8
            attendance.status = 'Present'
        else:
            attendance.ot_hours = 0
            attendance.status = 'Present'


# 2a. GET /api/v2/attendance/
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def v2_attendance_list(request):
    """
    Paginated attendance list for the rebuilt attendance editor.
    Returns employee_name, is_locked, is_active per record.
    Supports: outlet_id, employee_id, start_date, end_date, page, page_size.
    """
    user = request.user
    outlet_id_str = request.query_params.get('outlet_id')
    employee_id = request.query_params.get('employee_id')
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 25))

    base_qs = Attendance.objects.select_related('employee')

    if user.is_staff:
        queryset = base_qs.all()
        if outlet_id_str and outlet_id_str != '0':
            queryset = queryset.filter(employee__outlets__id=outlet_id_str)
    elif user.groups.filter(name='Manager').exists():
        try:
            manager_outlets = user.employee.outlets.all()
            if not manager_outlets.exists():
                return Response({'count': 0, 'results': []})
            queryset = base_qs.filter(employee__outlets__in=manager_outlets)
            if outlet_id_str and outlet_id_str != '0':
                queryset = queryset.filter(
                    employee__outlets__id=outlet_id_str,
                    employee__outlets__in=manager_outlets
                )
        except Exception:
            return Response({'count': 0, 'results': []})
    else:
        return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    if start_date_str:
        queryset = queryset.filter(date__gte=start_date_str)
    if end_date_str:
        queryset = queryset.filter(date__lte=end_date_str)
    if employee_id:
        queryset = queryset.filter(employee_id=employee_id)

    from main.active_periods import filter_qs_by_active_periods
    queryset = filter_qs_by_active_periods(queryset, employee_field='employee', date_field='date')
    queryset = queryset.distinct().order_by('-date', 'employee')
    total = queryset.count()

    offset = (page - 1) * page_size
    records = queryset[offset: offset + page_size]

    results = []
    for att in records:
        results.append({
            'attendance_id': att.attendance_id,
            'employee': att.employee.employee_id,
            'employee_name': att.employee.fullname or att.employee.first_name or '',
            'is_active': att.employee.is_active,
            'date': str(att.date),
            'check_in_time': att.check_in_time.isoformat() if att.check_in_time else None,
            'check_out_time': att.check_out_time.isoformat() if att.check_out_time else None,
            'worked_hours': att.worked_hours,
            'ot_hours': att.ot_hours,
            'status': att.status,
            'punchin_verification': att.punchin_verification,
            'punchout_verification': att.punchout_verification,
            'verification_notes': att.verification_notes,
            'is_locked': _is_locked(att.date),
        })

    return Response({'count': total, 'results': results})


# 2b. POST /api/v2/attendance/update/
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def v2_attendance_update(request):
    """
    Update check-in/check-out for an unlocked attendance record (<45 days old).
    Locked records require an edit request instead.
    """
    data = request.data
    attendance_id = data.get('attendance_id')
    new_check_in = data.get('check_in_time')
    new_check_out = data.get('check_out_time')

    if not attendance_id:
        return Response({'error': 'attendance_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        attendance = Attendance.objects.get(attendance_id=attendance_id)
    except Attendance.DoesNotExist:
        return Response({'error': 'Attendance record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if _is_locked(attendance.date):
        return Response(
            {'error': 'This record is locked (older than 45 days). Submit an edit request instead.'},
            status=status.HTTP_403_FORBIDDEN
        )

    notes = attendance.verification_notes or {}

    if new_check_in:
        try:
            check_in_dt = parser.parse(new_check_in)
            original = notes.get('checkin_update', {}).get('Original_check_in_time') or (
                str(attendance.check_in_time) if attendance.check_in_time else None
            )
            attendance.check_in_time = check_in_dt
            notes['checkin_update'] = {
                'updated_by': request.user.username,
                'Original_check_in_time': original,
                'check_in_time': str(check_in_dt),
                'updated_at': timezone.now().isoformat(),
            }
            attendance.punchin_verification = 'Verified'
        except Exception as e:
            return Response({'error': f'Invalid check_in_time: {e}'}, status=status.HTTP_400_BAD_REQUEST)

    if new_check_out:
        try:
            check_out_dt = parser.parse(new_check_out)
            original = notes.get('checkout_update', {}).get('Original_check_out_time') or (
                str(attendance.check_out_time) if attendance.check_out_time else None
            )
            attendance.check_out_time = check_out_dt
            notes['checkout_update'] = {
                'updated_by': request.user.username,
                'Original_check_out_time': original,
                'check_out_time': str(check_out_dt),
                'updated_at': timezone.now().isoformat(),
            }
            attendance.punchout_verification = 'Verified'
        except Exception as e:
            return Response({'error': f'Invalid check_out_time: {e}'}, status=status.HTTP_400_BAD_REQUEST)

    _recalculate_attendance(attendance)
    attendance.verification_notes = notes
    attendance.save()

    return Response({
        'message': 'Attendance updated successfully.',
        'attendance_id': attendance.attendance_id,
        'worked_hours': attendance.worked_hours,
        'ot_hours': attendance.ot_hours,
        'status': attendance.status,
    })


# 2c. DELETE /api/v2/attendance/delete/
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def v2_attendance_delete(request):
    """
    Hard delete an attendance record.
    Manager must own the outlet of the attendance record.
    """
    attendance_id = request.data.get('attendance_id')
    if not attendance_id:
        return Response({'error': 'attendance_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        attendance = Attendance.objects.select_related('employee').get(attendance_id=attendance_id)
    except Attendance.DoesNotExist:
        return Response({'error': 'Attendance record not found.'}, status=status.HTTP_404_NOT_FOUND)

    user = request.user
    if not user.is_staff:
        try:
            manager_outlets = user.employee.outlets.all()
            emp_outlets = attendance.employee.outlets.all()
            if not manager_outlets.filter(id__in=emp_outlets).exists():
                return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    attendance.delete()
    return Response({'message': 'Attendance record deleted successfully.'})


# 2d. POST /api/v2/attendance/bulk-add/
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def v2_attendance_bulk_add(request):
    """
    Bulk add attendance records for multiple employees on a single date.
    Delegates to the existing bulk_add_attendance logic.
    """
    return bulk_add_attendance(request)


# 2e. POST /api/v2/attendance/edit-request/
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def v2_attendance_edit_request(request):
    """
    Submit an edit request for a locked attendance record (>=45 days old).
    Manager provides proposed new check-in/out times and a reason.
    Admin must approve before changes are applied.
    """
    data = request.data
    attendance_id = data.get('attendance_id')
    proposed_check_in_str = data.get('proposed_check_in')
    proposed_check_out_str = data.get('proposed_check_out')
    reason = data.get('reason', '').strip()

    if not attendance_id:
        return Response({'error': 'attendance_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not proposed_check_in_str or not proposed_check_out_str:
        return Response({'error': 'proposed_check_in and proposed_check_out are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not reason:
        return Response({'error': 'reason is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        attendance = Attendance.objects.get(attendance_id=attendance_id)
    except Attendance.DoesNotExist:
        return Response({'error': 'Attendance record not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not _is_locked(attendance.date):
        return Response(
            {'error': 'This record is not locked. Use the regular update endpoint instead.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        proposed_check_in = parser.parse(proposed_check_in_str)
        proposed_check_out = parser.parse(proposed_check_out_str)
    except Exception as e:
        return Response({'error': f'Invalid datetime format: {e}'}, status=status.HTTP_400_BAD_REQUEST)

    if proposed_check_out <= proposed_check_in:
        return Response({'error': 'proposed_check_out must be after proposed_check_in.'}, status=status.HTTP_400_BAD_REQUEST)

    edit_request = AttendanceEditRequest.objects.create(
        attendance=attendance,
        requested_by=request.user,
        proposed_check_in=proposed_check_in,
        proposed_check_out=proposed_check_out,
        reason=reason,
    )

    return Response({
        'message': 'Edit request submitted successfully. Awaiting admin approval.',
        'request_id': edit_request.request_id,
    }, status=status.HTTP_201_CREATED)


# 2f. GET /api/v2/attendance/edit-requests/
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def v2_attendance_edit_requests_list(request):
    """
    Admin only. List all attendance edit requests with optional status filter.
    """
    if not request.user.is_staff:
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    filter_status = request.query_params.get('status')  # Pending / Approved / Rejected
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 25))

    qs = AttendanceEditRequest.objects.select_related(
        'attendance__employee', 'requested_by', 'reviewed_by'
    )
    if filter_status:
        qs = qs.filter(status=filter_status)

    total = qs.count()
    offset = (page - 1) * page_size
    records = qs[offset: offset + page_size]

    results = []
    for req in records:
        att = req.attendance
        results.append({
            'request_id': req.request_id,
            'attendance_id': att.attendance_id,
            'employee_name': att.employee.fullname or att.employee.first_name or '',
            'date': str(att.date),
            'current_check_in': att.check_in_time.isoformat() if att.check_in_time else None,
            'current_check_out': att.check_out_time.isoformat() if att.check_out_time else None,
            'proposed_check_in': req.proposed_check_in.isoformat(),
            'proposed_check_out': req.proposed_check_out.isoformat(),
            'reason': req.reason,
            'status': req.status,
            'requested_by': req.requested_by.username if req.requested_by else None,
            'reviewed_by': req.reviewed_by.username if req.reviewed_by else None,
            'reviewed_at': req.reviewed_at.isoformat() if req.reviewed_at else None,
            'created_at': req.created_at.isoformat(),
        })

    return Response({'count': total, 'results': results})


# 2g. POST /api/v2/attendance/edit-requests/review/
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def v2_attendance_edit_requests_review(request):
    """
    Admin only. Approve or reject an attendance edit request.
    On approval: proposed check-in/out are applied immediately and worked_hours recalculated.
    """
    if not request.user.is_staff:
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    request_id = data.get('request_id')
    action = data.get('action')  # 'approve' or 'reject'

    if not request_id or action not in ('approve', 'reject'):
        return Response(
            {'error': 'request_id and action ("approve" or "reject") are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        edit_request = AttendanceEditRequest.objects.select_related('attendance').get(request_id=request_id)
    except AttendanceEditRequest.DoesNotExist:
        return Response({'error': 'Edit request not found.'}, status=status.HTTP_404_NOT_FOUND)

    if edit_request.status != 'Pending':
        return Response(
            {'error': f'This request is already {edit_request.status}.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    edit_request.reviewed_by = request.user
    edit_request.reviewed_at = timezone.now()

    if action == 'approve':
        att = edit_request.attendance
        notes = att.verification_notes or {}

        notes['checkin_update'] = {
            'updated_by': request.user.username,
            'Original_check_in_time': att.check_in_time.isoformat() if att.check_in_time else None,
            'check_in_time': edit_request.proposed_check_in.isoformat(),
            'updated_at': timezone.now().isoformat(),
            'via_edit_request': edit_request.request_id,
        }
        notes['checkout_update'] = {
            'updated_by': request.user.username,
            'Original_check_out_time': att.check_out_time.isoformat() if att.check_out_time else None,
            'check_out_time': edit_request.proposed_check_out.isoformat(),
            'updated_at': timezone.now().isoformat(),
            'via_edit_request': edit_request.request_id,
        }

        att.check_in_time = edit_request.proposed_check_in
        att.check_out_time = edit_request.proposed_check_out
        att.punchin_verification = 'Verified'
        att.punchout_verification = 'Verified'
        att.verification_notes = notes
        _recalculate_attendance(att)
        att.save()

        edit_request.status = 'Approved'
        edit_request.save()

        return Response({
            'message': 'Edit request approved. Attendance record has been updated.',
            'request_id': edit_request.request_id,
            'attendance_id': att.attendance_id,
        })
    else:
        edit_request.status = 'Rejected'
        edit_request.save()
        return Response({
            'message': 'Edit request rejected.',
            'request_id': edit_request.request_id,
        })


# =============================================================================
# V3 ATTENDANCE APIs — management console (history / add / modify / delete)
# Filters by employee.primary_outlet to stay consistent with leave management.
# =============================================================================

from aas.pagination import StandardPagination  # noqa: E402


ATTENDANCE_LOCK_DAYS = 45


def _v3_is_admin(user):
    """Admin via is_staff/is_superuser OR Django 'Admin' group membership."""
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    return user.groups.filter(name__iexact='Admin').exists()


def _v3_is_date_past_lock(att_date):
    """Default 45-day rule: records older than ATTENDANCE_LOCK_DAYS lock automatically."""
    if not att_date:
        return False
    today = timezone.localdate()
    return (today - att_date).days > ATTENDANCE_LOCK_DAYS


def _v3_outlet_lock_covers(outlet_id, att_date):
    """True if an ACTIVE lock period covers (outlet, date)."""
    if not outlet_id or not att_date:
        return False
    return AttendanceLockPeriod.objects.filter(
        outlet_id=outlet_id,
        active=True,
        start_date__lte=att_date,
        end_date__gte=att_date,
    ).exists()


def _v3_is_record_locked(att):
    """Combined check: 45-day rule OR admin-defined lock period for this outlet."""
    if att is None:
        return False
    if _v3_is_date_past_lock(att.date):
        return True
    return _v3_outlet_lock_covers(att.employee.primary_outlet_id, att.date)


def _v3_can_access_outlet(user, outlet_id):
    """Admin sees anything; manager must be assigned to the outlet."""
    if _v3_is_admin(user):
        return True
    emp = getattr(user, 'employee', None)
    if not emp:
        return False
    return emp.outlets.filter(id=outlet_id).exists()


def _v3_local_iso(dt):
    """Return ISO string in the project's local timezone (+05:30)."""
    if not dt:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt)
    return timezone.localtime(dt).isoformat()


def _v3_serialize(att):
    return {
        "attendance_id": att.attendance_id,
        "employee_id": att.employee_id,
        "employee_fullname": att.employee.fullname,
        "empcode": att.employee.empcode,
        "date": att.date.isoformat() if att.date else None,
        "check_in_time": _v3_local_iso(att.check_in_time),
        "check_out_time": _v3_local_iso(att.check_out_time),
        "worked_hours": att.worked_hours,
        "ot_hours": att.ot_hours,
        "status": att.status,
        "punchin_verification": att.punchin_verification,
        "punchout_verification": att.punchout_verification,
        "created_at": _v3_local_iso(att.created_at),
        "is_locked": _v3_is_record_locked(att),
    }


def _v3_serialize_mod_log(log):
    return {
        "log_id": log.log_id,
        "attendance_id": log.attendance_id,
        "status": log.status,
        "reason": log.reason or '',
        "review_note": log.review_note or '',
        "requested_by": log.requested_by.username if log.requested_by else None,
        "requested_at": _v3_local_iso(log.requested_at),
        "reviewed_by": log.reviewed_by.username if log.reviewed_by else None,
        "reviewed_at": _v3_local_iso(log.reviewed_at),
        "original": {
            "date": log.original_date.isoformat() if log.original_date else None,
            "check_in_time": _v3_local_iso(log.original_check_in_time),
            "check_out_time": _v3_local_iso(log.original_check_out_time),
            "status": log.original_status,
        },
        "proposed": {
            "date": log.new_date.isoformat() if log.new_date else None,
            "check_in_time": _v3_local_iso(log.new_check_in_time),
            "check_out_time": _v3_local_iso(log.new_check_out_time),
            "status": log.new_status,
        },
    }


def _v3_combine(date_obj, time_str):
    """Combine a date + 'HH:MM' into a timezone-aware datetime in project TZ."""
    if not time_str:
        return None
    try:
        t = datetime.strptime(time_str, '%H:%M').time()
    except ValueError:
        try:
            t = datetime.strptime(time_str, '%H:%M:%S').time()
        except ValueError:
            return None
    naive = datetime.combine(date_obj, t)
    return timezone.make_aware(naive)


# 1. GET /api/v3/attendance/ — history with filters
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def v3_attendance_list(request):
    outlet_id = request.GET.get('outlet_id')
    employee_id = request.GET.get('employee_id')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    status_filter = request.GET.get('status')

    if not outlet_id:
        return Response({"error": "outlet_id is required"}, status=400)
    try:
        outlet_id = int(outlet_id)
    except (TypeError, ValueError):
        return Response({"error": "Invalid outlet_id"}, status=400)

    if not _v3_can_access_outlet(request.user, outlet_id):
        return Response({"error": "You are not assigned to this outlet."}, status=403)

    qs = Attendance.objects.select_related('employee').filter(
        employee__primary_outlet_id=outlet_id
    )

    if employee_id:
        try:
            qs = qs.filter(employee_id=int(employee_id))
        except (TypeError, ValueError):
            return Response({"error": "Invalid employee_id"}, status=400)
    if start_date and end_date:
        qs = qs.filter(date__range=[start_date, end_date])
    elif start_date:
        qs = qs.filter(date__gte=start_date)
    elif end_date:
        qs = qs.filter(date__lte=end_date)
    if status_filter and status_filter != 'all':
        qs = qs.filter(status=status_filter)

    from main.active_periods import filter_qs_by_active_periods
    qs = filter_qs_by_active_periods(qs, employee_field='employee', date_field='date')

    qs = qs.order_by('-date', '-check_in_time')

    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    items = [_v3_serialize(a) for a in page]
    return paginator.get_paginated_response(items)


# 2. POST /api/v3/attendance/bulk-add/ — manual attendance for many emp × many dates
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def v3_attendance_bulk_add(request):
    """
    Body:
      employee_ids: [int, ...]
      dates: ['YYYY-MM-DD', ...]
      status: 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave' (default Present)
      check_in_time: 'HH:MM' (optional)
      check_out_time: 'HH:MM' (optional)

    Skips (employee, date) pairs where:
      - An attendance record already exists
      - An active (pending/approved) leave exists
    """
    data = request.data
    employee_ids = data.get('employee_ids') or []
    dates_raw = data.get('dates') or []
    att_status = data.get('status', 'Present')
    check_in_str = (data.get('check_in_time') or '').strip()
    check_out_str = (data.get('check_out_time') or '').strip()

    if not employee_ids or not dates_raw:
        return Response({"error": "employee_ids and dates are required."}, status=400)

    valid_statuses = {s for s, _ in Attendance.STATUS_CHOICES}
    if att_status not in valid_statuses:
        return Response({"error": f"Invalid status. Use one of: {', '.join(sorted(valid_statuses))}."}, status=400)

    # Parse + dedupe dates
    dates = []
    for d in dates_raw:
        try:
            dates.append(parser.parse(str(d)).date())
        except (ValueError, TypeError):
            return Response({"error": f"Invalid date: {d}."}, status=400)
    dates = sorted(set(dates))

    employees = list(Employee.objects.filter(employee_id__in=employee_ids))
    employees_by_id = {e.employee_id: e for e in employees}

    # Preflight permission: all employees must be reachable by the user.
    # Admin bypasses. Managers: every employee's primary_outlet must be in their outlets.
    user = request.user
    if not (user.is_staff or user.is_superuser):
        emp = getattr(user, 'employee', None)
        allowed_outlets = set(emp.outlets.values_list('id', flat=True)) if emp else set()
        for e in employees:
            if e.primary_outlet_id not in allowed_outlets:
                return Response(
                    {"error": f"Employee {e.fullname} is not in an outlet you manage."},
                    status=403,
                )

    existing_att = set(
        Attendance.objects
        .filter(employee_id__in=employee_ids, date__in=dates)
        .values_list('employee_id', 'date')
    )
    active_leaves = set(
        EmpLeave.objects
        .filter(employee_id__in=employee_ids, leave_date__in=dates, status__in=['pending', 'approved'])
        .values_list('employee_id', 'leave_date')
    )

    successful = []
    skipped = []

    for emp_id in employee_ids:
        try:
            emp_key = int(emp_id)
        except (TypeError, ValueError):
            emp_key = emp_id
        emp = employees_by_id.get(emp_key)
        if not emp:
            for d in dates:
                skipped.append({"employee_id": emp_id, "date": str(d), "reason": "Employee not found."})
            continue

        for d in dates:
            key = (emp.employee_id, d)
            if key in existing_att:
                skipped.append({"employee_id": emp.employee_id, "date": str(d), "reason": "Attendance already exists."})
                continue
            if key in active_leaves:
                skipped.append({"employee_id": emp.employee_id, "date": str(d), "reason": "Active leave exists on this date."})
                continue

            check_in_dt = _v3_combine(d, check_in_str) or timezone.make_aware(
                datetime.combine(d, datetime.min.time().replace(hour=9))
            )
            check_out_dt = _v3_combine(d, check_out_str)

            try:
                att = Attendance.objects.create(
                    employee=emp,
                    date=d,
                    check_in_time=check_in_dt,
                    check_in_lat=0.0,
                    check_in_long=0.0,
                    check_out_time=check_out_dt,
                    check_out_lat=0.0 if check_out_dt else None,
                    check_out_long=0.0 if check_out_dt else None,
                    status=att_status,
                    punchin_verification='Verified',
                    punchout_verification='Verified' if check_out_dt else 'Pending',
                )
                successful.append({
                    "employee_id": emp.employee_id,
                    "date": str(d),
                    "attendance_id": att.attendance_id,
                })
            except Exception as e:
                skipped.append({"employee_id": emp.employee_id, "date": str(d), "reason": str(e)})

    return Response({
        "message": f"{len(successful)} added, {len(skipped)} skipped.",
        "successful": successful,
        "skipped": skipped,
    }, status=200)


# 3. PATCH /api/v3/attendance/<id>/ — modify a single record
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def v3_attendance_update(request, id):
    try:
        att = Attendance.objects.select_related('employee').get(attendance_id=id)
    except Attendance.DoesNotExist:
        return Response({"error": "Attendance not found."}, status=404)

    if not _v3_can_access_outlet(request.user, att.employee.primary_outlet_id):
        return Response({"error": "You are not authorized to modify this record."}, status=403)

    data = request.data

    def _parse_date(raw):
        try:
            return parser.parse(str(raw)).date()
        except (ValueError, TypeError):
            return None

    # --- Resolve desired check-in date + time ---
    ci_date = None
    if 'check_in_date' in data:
        raw = data.get('check_in_date')
        if raw in (None, '', 'null'):
            return Response({"error": "Check-in date cannot be empty."}, status=400)
        ci_date = _parse_date(raw)
        if ci_date is None:
            return Response({"error": "Invalid check_in_date."}, status=400)
    else:
        ci_date = att.date

    ci_time_str = None
    has_ci_time_field = 'check_in_time' in data
    if has_ci_time_field:
        raw = data.get('check_in_time')
        ci_time_str = (str(raw).strip() if raw not in (None, '') else '')
        if not ci_time_str:
            return Response({"error": "Check-in time cannot be empty."}, status=400)
    else:
        if att.check_in_time:
            local_ci = timezone.localtime(att.check_in_time) if timezone.is_aware(att.check_in_time) else att.check_in_time
            ci_time_str = local_ci.strftime('%H:%M')

    if ci_time_str:
        new_ci = _v3_combine(ci_date, ci_time_str)
        if new_ci is None:
            return Response({"error": "Invalid check_in_time."}, status=400)
    else:
        new_ci = None

    # --- Resolve desired check-out date + time ---
    co_cleared = False
    new_co = att.check_out_time

    has_co_date_field = 'check_out_date' in data
    has_co_time_field = 'check_out_time' in data

    if has_co_time_field and data.get('check_out_time') in (None, '', 'null'):
        co_cleared = True
        new_co = None
    else:
        co_date = None
        if has_co_date_field:
            raw = data.get('check_out_date')
            if raw in (None, '', 'null'):
                co_date = None
            else:
                co_date = _parse_date(raw)
                if co_date is None:
                    return Response({"error": "Invalid check_out_date."}, status=400)
        else:
            if att.check_out_time:
                local_co = timezone.localtime(att.check_out_time) if timezone.is_aware(att.check_out_time) else att.check_out_time
                co_date = local_co.date()

        co_time_str = None
        if has_co_time_field:
            co_time_str = str(data.get('check_out_time')).strip()
        else:
            if att.check_out_time:
                local_co = timezone.localtime(att.check_out_time) if timezone.is_aware(att.check_out_time) else att.check_out_time
                co_time_str = local_co.strftime('%H:%M')

        if co_time_str:
            if co_date is None:
                co_date = ci_date
            combined = _v3_combine(co_date, co_time_str)
            if combined is None:
                return Response({"error": "Invalid check_out_time."}, status=400)
            new_co = combined
        elif has_co_date_field and not has_co_time_field:
            return Response({"error": "Check-out date provided without a time."}, status=400)

    # --- Conflict checks on the new attendance date (= check-in date) ---
    if ci_date != att.date:
        clash = (
            Attendance.objects
            .filter(employee_id=att.employee_id, date=ci_date)
            .exclude(attendance_id=att.attendance_id)
            .exists()
        )
        if clash:
            return Response(
                {"error": "Another attendance record already exists for this employee on the chosen check-in date."},
                status=400,
            )
        clash_leave = EmpLeave.objects.filter(
            employee_id=att.employee_id, leave_date=ci_date, status__in=['pending', 'approved'],
        ).exists()
        if clash_leave:
            return Response(
                {"error": "Employee has an active leave on the chosen check-in date."},
                status=400,
            )

    if new_ci and new_co and new_co <= new_ci:
        return Response({"error": "Check-out must be after check-in."}, status=400)

    new_status_value = att.status
    if 'status' in data:
        valid_statuses = {s for s, _ in Attendance.STATUS_CHOICES}
        if data['status'] not in valid_statuses:
            return Response({"error": "Invalid status."}, status=400)
        new_status_value = data['status']

    reason = (str(data.get('reason') or '')).strip()

    # --- Snapshot ORIGINAL before any changes ---
    snapshot = {
        "original_date": att.date,
        "original_check_in_time": att.check_in_time,
        "original_check_out_time": att.check_out_time,
        "original_status": att.status,
        "new_date": ci_date,
        "new_check_in_time": new_ci,
        "new_check_out_time": None if co_cleared else new_co,
        "new_status": new_status_value,
    }

    # --- Lock check (45-day rule OR admin-defined lock period) ---
    is_admin = _v3_is_admin(request.user)
    if _v3_is_record_locked(att) and not is_admin:
        if not reason:
            return Response(
                {"error": "This record is older than 45 days. A reason is required to submit for admin approval."},
                status=400,
            )
        log = AttendanceModificationLog.objects.create(
            attendance=att,
            status='Pending',
            reason=reason,
            requested_by=request.user,
            **snapshot,
        )
        return Response({
            "pending_approval": True,
            "message": "Record is locked (older than 45 days). Your change has been submitted for admin approval.",
            "log": _v3_serialize_mod_log(log),
        }, status=202)

    # --- Apply immediately (admin, or within lock window) ---
    att.date = ci_date
    if new_ci is not None:
        att.check_in_time = new_ci

    if co_cleared:
        att.check_out_time = None
        att.check_out_lat = None
        att.check_out_long = None
        att.punchout_verification = 'Pending'
    elif new_co is not None:
        att.check_out_time = new_co
        if att.check_out_lat is None:
            att.check_out_lat = 0.0
        if att.check_out_long is None:
            att.check_out_long = 0.0
        att.punchout_verification = 'Verified'

    att.status = new_status_value
    att.save()  # model.save() recomputes worked_hours + may flip status to Half Day

    AttendanceModificationLog.objects.create(
        attendance=att,
        status='Applied',
        reason=reason,
        requested_by=request.user,
        **snapshot,
    )

    return Response(_v3_serialize(att))


# 4. DELETE /api/v3/attendance/<id>/ — delete a record
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def v3_attendance_delete(request, id):
    try:
        att = Attendance.objects.select_related('employee').get(attendance_id=id)
    except Attendance.DoesNotExist:
        return Response({"error": "Attendance not found."}, status=404)

    if not _v3_can_access_outlet(request.user, att.employee.primary_outlet_id):
        return Response({"error": "You are not authorized to delete this record."}, status=403)

    att.delete()
    return Response({"message": "Attendance record deleted."}, status=200)


# 5. GET /api/attendance/v3/<id>/modifications/ — history log for one record
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def v3_attendance_mod_history(request, id):
    try:
        att = Attendance.objects.select_related('employee').get(attendance_id=id)
    except Attendance.DoesNotExist:
        return Response({"error": "Attendance not found."}, status=404)

    if not _v3_can_access_outlet(request.user, att.employee.primary_outlet_id):
        return Response({"error": "You are not authorized to view this record."}, status=403)

    logs = AttendanceModificationLog.objects.filter(attendance=att).select_related('requested_by', 'reviewed_by')
    return Response({
        "attendance_id": att.attendance_id,
        "is_locked": _v3_is_record_locked(att),
        "lock_days": ATTENDANCE_LOCK_DAYS,
        "logs": [_v3_serialize_mod_log(l) for l in logs],
    })


# 6. GET /api/attendance/v3/modification-requests/ — admin approval queue
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def v3_modification_requests_list(request):
    """Admin sees everything. Non-admin managers see logs for attendance
    records whose employee's PRIMARY outlet is in the manager's assigned outlets."""
    status_filter = request.GET.get('status', 'Pending')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    qs = (
        AttendanceModificationLog.objects
        .select_related('attendance', 'attendance__employee', 'requested_by', 'reviewed_by')
    )

    if not _v3_is_admin(request.user):
        emp = getattr(request.user, 'employee', None)
        if not emp:
            return Response({"results": [], "count": 0})
        outlet_ids = list(emp.outlets.values_list('id', flat=True))
        qs = qs.filter(attendance__employee__primary_outlet_id__in=outlet_ids)

    if status_filter and status_filter != 'all':
        qs = qs.filter(status=status_filter)
    if start_date:
        qs = qs.filter(requested_at__date__gte=start_date)
    if end_date:
        qs = qs.filter(requested_at__date__lte=end_date)

    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    items = []
    for log in page:
        row = _v3_serialize_mod_log(log)
        row["employee_id"] = log.attendance.employee_id
        row["employee_fullname"] = log.attendance.employee.fullname
        row["empcode"] = log.attendance.employee.empcode
        items.append(row)
    return paginator.get_paginated_response(items)


# 7. POST /api/attendance/v3/modification-requests/<log_id>/approve/
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def v3_modification_request_approve(request, log_id):
    if not _v3_is_admin(request.user):
        return Response({"error": "Admin access required."}, status=403)

    try:
        log = AttendanceModificationLog.objects.select_related('attendance').get(log_id=log_id)
    except AttendanceModificationLog.DoesNotExist:
        return Response({"error": "Modification request not found."}, status=404)

    if log.status != 'Pending':
        return Response({"error": f"Request is already {log.status}."}, status=400)

    att = log.attendance
    ci_date = log.new_date or att.date

    # Conflict re-check at approval time (state may have changed since submission)
    if ci_date != att.date:
        clash = (
            Attendance.objects
            .filter(employee_id=att.employee_id, date=ci_date)
            .exclude(attendance_id=att.attendance_id)
            .exists()
        )
        if clash:
            return Response(
                {"error": "Another attendance record already exists on the target date."},
                status=400,
            )
        clash_leave = EmpLeave.objects.filter(
            employee_id=att.employee_id, leave_date=ci_date, status__in=['pending', 'approved'],
        ).exists()
        if clash_leave:
            return Response({"error": "Employee has an active leave on the target date."}, status=400)

    att.date = ci_date
    if log.new_check_in_time is not None:
        att.check_in_time = log.new_check_in_time
    if log.new_check_out_time is None:
        att.check_out_time = None
        att.check_out_lat = None
        att.check_out_long = None
        att.punchout_verification = 'Pending'
    else:
        att.check_out_time = log.new_check_out_time
        if att.check_out_lat is None:
            att.check_out_lat = 0.0
        if att.check_out_long is None:
            att.check_out_long = 0.0
        att.punchout_verification = 'Verified'
    if log.new_status:
        att.status = log.new_status
    att.save()

    log.status = 'Approved'
    log.reviewed_by = request.user
    log.reviewed_at = timezone.now()
    log.review_note = (str(request.data.get('review_note') or '')).strip()
    log.save()

    return Response({
        "message": "Modification approved and applied.",
        "log": _v3_serialize_mod_log(log),
        "attendance": _v3_serialize(att),
    })


# 8. POST /api/attendance/v3/modification-requests/<log_id>/reject/
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def v3_modification_request_reject(request, log_id):
    if not _v3_is_admin(request.user):
        return Response({"error": "Admin access required."}, status=403)

    try:
        log = AttendanceModificationLog.objects.get(log_id=log_id)
    except AttendanceModificationLog.DoesNotExist:
        return Response({"error": "Modification request not found."}, status=404)

    if log.status != 'Pending':
        return Response({"error": f"Request is already {log.status}."}, status=400)

    log.status = 'Rejected'
    log.reviewed_by = request.user
    log.reviewed_at = timezone.now()
    log.review_note = (str(request.data.get('review_note') or '')).strip()
    log.save()

    return Response({
        "message": "Modification request rejected.",
        "log": _v3_serialize_mod_log(log),
    })


# =============================================================================
# Attendance Lock Periods — admin-defined (outlet, range) locks
# =============================================================================

def _v3_serialize_lock_period(lp):
    return {
        "lock_id": lp.lock_id,
        "outlet_id": lp.outlet_id,
        "outlet_name": lp.outlet.name if lp.outlet_id else None,
        "start_date": lp.start_date.isoformat() if lp.start_date else None,
        "end_date": lp.end_date.isoformat() if lp.end_date else None,
        "note": lp.note or '',
        "active": lp.active,
        "created_by": lp.created_by.username if lp.created_by else None,
        "created_at": _v3_local_iso(lp.created_at),
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def v3_lock_periods(request):
    """GET: list (optional ?outlet_id=, ?active=true).  POST: create (admin)."""
    if request.method == 'GET':
        qs = AttendanceLockPeriod.objects.select_related('outlet', 'created_by')
        outlet_id = request.GET.get('outlet_id')
        if outlet_id:
            try:
                qs = qs.filter(outlet_id=int(outlet_id))
            except (TypeError, ValueError):
                return Response({"error": "Invalid outlet_id"}, status=400)
        active_param = request.GET.get('active')
        if active_param is not None and active_param.lower() in ('true', '1', 'yes'):
            qs = qs.filter(active=True)
        elif active_param is not None and active_param.lower() in ('false', '0', 'no'):
            qs = qs.filter(active=False)
        return Response([_v3_serialize_lock_period(lp) for lp in qs])

    # POST
    if not _v3_is_admin(request.user):
        return Response({"error": "Admin access required."}, status=403)

    data = request.data
    try:
        outlet_id = int(data.get('outlet_id'))
    except (TypeError, ValueError):
        return Response({"error": "outlet_id is required."}, status=400)

    try:
        start_date = parser.parse(str(data.get('start_date'))).date()
        end_date = parser.parse(str(data.get('end_date'))).date()
    except (ValueError, TypeError):
        return Response({"error": "start_date and end_date are required (YYYY-MM-DD)."}, status=400)

    if end_date < start_date:
        return Response({"error": "end_date must be on or after start_date."}, status=400)

    try:
        outlet = Outlet.objects.get(id=outlet_id)
    except Outlet.DoesNotExist:
        return Response({"error": "Outlet not found."}, status=404)

    lp = AttendanceLockPeriod.objects.create(
        outlet=outlet,
        start_date=start_date,
        end_date=end_date,
        note=(str(data.get('note') or '')).strip(),
        active=True,
        created_by=request.user,
    )
    return Response(_v3_serialize_lock_period(lp), status=201)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def v3_lock_period_detail(request, lock_id):
    if not _v3_is_admin(request.user):
        return Response({"error": "Admin access required."}, status=403)

    try:
        lp = AttendanceLockPeriod.objects.select_related('outlet').get(lock_id=lock_id)
    except AttendanceLockPeriod.DoesNotExist:
        return Response({"error": "Lock period not found."}, status=404)

    if request.method == 'DELETE':
        lp.delete()
        return Response({"message": "Lock period deleted."}, status=200)

    # PATCH — toggle active / edit fields
    data = request.data
    if 'active' in data:
        lp.active = bool(data.get('active'))
    if 'note' in data:
        lp.note = (str(data.get('note') or '')).strip()
    if 'start_date' in data:
        try:
            lp.start_date = parser.parse(str(data.get('start_date'))).date()
        except (ValueError, TypeError):
            return Response({"error": "Invalid start_date."}, status=400)
    if 'end_date' in data:
        try:
            lp.end_date = parser.parse(str(data.get('end_date'))).date()
        except (ValueError, TypeError):
            return Response({"error": "Invalid end_date."}, status=400)
    if lp.end_date < lp.start_date:
        return Response({"error": "end_date must be on or after start_date."}, status=400)
    lp.save()
    return Response(_v3_serialize_lock_period(lp))