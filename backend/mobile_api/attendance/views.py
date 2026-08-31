import logging

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from main.models import Attendance, EmpLeave
from main.serializers import AttendanceSerializer
from main.utils import verify_location
from attendance.face_recognition import compare_faces

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_attendance(request):
    """Return today's attendance status and last punch-in time."""
    try:
        employee = request.user.employee
    except Exception:
        return Response({"error": "Employee profile not found"}, status=403)

    today = timezone.localdate()

    # Only consider today's open record. A record left open from a previous
    # day is a forgotten punch-out; closing it now would stamp today's time
    # onto yesterday's session (producing 47h / 120h "worked hours").
    open_record = Attendance.objects.filter(
        employee=employee,
        date=today,
        check_out_time__isnull=True,
    ).order_by('-check_in_time').first()

    if open_record:
        check_in_local = timezone.localtime(open_record.check_in_time)
        return Response({
            "punched_in": True,
            "check_in_time": check_in_local.strftime("%H:%M"),
            "check_in_date": check_in_local.strftime("%Y-%m-%d"),
            "is_carryover": False,
            "check_out_time": None,
            "attendance_id": open_record.attendance_id,
        })

    # No open record — check if they punched in and out already today
    last_record = Attendance.objects.filter(
        employee=employee,
        date=today,
    ).last()

    if last_record:
        check_in_local = timezone.localtime(last_record.check_in_time)
        check_out_local = timezone.localtime(last_record.check_out_time) if last_record.check_out_time else None
        return Response({
            "punched_in": False,
            "check_in_time": check_in_local.strftime("%H:%M"),
            "check_out_time": check_out_local.strftime("%H:%M") if check_out_local else None,
            "attendance_id": last_record.attendance_id,
        })

    return Response({"punched_in": False, "check_in_time": None, "check_out_time": None})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_profile(request):
    """Return employee profile including reference photo URL."""
    try:
        employee = request.user.employee
    except Exception:
        return Response({"error": "Employee profile not found"}, status=403)

    reference_photo_url = None
    if employee.reference_photo:
        reference_photo_url = request.build_absolute_uri(employee.reference_photo.url)

    return Response({
        "fullname": employee.fullname,
        "empcode": employee.empcode,
        "reference_photo_url": reference_photo_url,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_history(request):
    """Return attendance records for the last 7 days."""
    try:
        employee = request.user.employee
    except Exception:
        return Response({"error": "Employee profile not found"}, status=403)

    from datetime import timedelta
    today = timezone.now().date()
    week_ago = today - timedelta(days=6)

    records = Attendance.objects.filter(
        employee=employee,
        date__gte=week_ago,
        date__lte=today,
    ).order_by('-date')

    data = []
    for r in records:
        check_in_local = timezone.localtime(r.check_in_time) if r.check_in_time else None
        check_out_local = timezone.localtime(r.check_out_time) if r.check_out_time else None
        data.append({
            "date": r.date.strftime("%Y-%m-%d"),
            "status": r.status,
            "check_in_time": check_in_local.strftime("%H:%M") if check_in_local else None,
            "check_out_time": check_out_local.strftime("%H:%M") if check_out_local else None,
            "worked_hours": round(r.worked_hours, 2) if r.worked_hours else None,
        })

    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def punch_in(request):
    try:
        try:
            employee = request.user.employee
        except Exception:
            return Response(
                {"error": "Employee profile not found for this user"},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data

        if not all(field in data for field in ['check_in_lat', 'check_in_long']):
            return Response({"error": "Missing required location fields"}, status=status.HTTP_400_BAD_REQUEST)

        if 'photo_check_in' not in request.FILES:
            return Response({"error": "Photo is required for punch-in"}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()

        # Block if today is inside an admin-defined lock period.
        from attendance.api import _date_admin_locked_for_employee
        if _date_admin_locked_for_employee(employee, today):
            return Response(
                {"error": "Attendance is locked for today. Contact an administrator."},
                status=status.HTTP_403_FORBIDDEN,
            )

        open_today = Attendance.objects.filter(
            employee=employee,
            date=today,
            check_out_time__isnull=True,
        ).order_by('-check_in_time').first()

        if open_today:
            return Response(
                {"error": "You must punch out from your previous session before punching in again"},
                status=400,
            )

        # Auto-close forgotten punch-outs from previous days so the user is
        # not permanently locked out. Missing check_out_time is preserved so
        # a manager can review; status flips to Half Day for reporting.
        stale = Attendance.objects.filter(
            employee=employee,
            date__lt=today,
            check_out_time__isnull=True,
        )
        for s in stale:
            s.punchout_verification = 'Pending'
            s.status = s.status or 'Half Day'
            s.save(update_fields=['punchout_verification', 'status'])

        try:
            check_in_lat = float(data.get('check_in_lat'))
            check_in_long = float(data.get('check_in_long'))
        except (TypeError, ValueError):
            return Response({"error": "Invalid latitude or longitude"}, status=status.HTTP_400_BAD_REQUEST)

        photo_file = request.FILES.get('photo_check_in')

        if not verify_location(employee, check_in_lat, check_in_long):
            return Response(
                {"error": "You're not at an allowed location for punch-in"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verified_status = 'Pending'
        response_message = "Punch-in recorded successfully!"

        if not employee.reference_photo:
            # Reject reference photos that don't contain exactly one face —
            # a bad reference permanently breaks the employee's biometric flow.
            from attendance.face_recognition import count_faces
            if all([
                getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
                getattr(settings, 'AWS_REKOGNITION_REGION', None),
            ]):
                try:
                    photo_file.seek(0)
                    ref_bytes = photo_file.read()
                except (AttributeError, OSError):
                    ref_bytes = None
                finally:
                    try:
                        photo_file.seek(0)
                    except (AttributeError, OSError):
                        pass
                if ref_bytes:
                    n_faces = count_faces(
                        ref_bytes,
                        aws_access_key=settings.AWS_ACCESS_KEY_ID,
                        aws_secret_key=settings.AWS_SECRET_ACCESS_KEY,
                        aws_region=settings.AWS_REKOGNITION_REGION,
                    )
                    if n_faces != 1:
                        return Response(
                            {"error": (
                                "Reference photo must contain exactly one clear face. "
                                f"Detected {n_faces}. Retake the photo."
                            )},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

            employee.reference_photo = photo_file
            employee.punchin_selfie = photo_file
            employee.save()
            verified_status = 'Pending'
            response_message = "Punch-in recorded. Your photo has been submitted for verification."

        else:
            employee.punchin_selfie = photo_file
            employee.save()

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
                    aws_region=settings.AWS_REKOGNITION_REGION,
                )

                if result.get('FaceMatches'):
                    verified_status = 'Verified'
                else:
                    return Response(
                        {"error": "Face recognition failed. Please try again."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            except Exception as e:
                logger.error(f"Face comparison error for employee {employee.employee_id}: {str(e)}")
                return Response(
                    {"error": "Could not process image. Ensure your face is clearly visible."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        leave_record = EmpLeave.objects.filter(
            employee=employee,
            leave_date=timezone.now().date(),
            status='approved',
        ).first()

        if leave_record:
            leave_record.status = 'rejected'
            leave_record.remarks = f"Employee punched in on an approved leave day: {timezone.now().date()}"
            leave_record.save()
            response_message = "Punch-in recorded. Leave for this day has been rejected."

        attendance = Attendance.objects.create(
            employee=employee,
            date=timezone.now().date(),
            check_in_time=timezone.now(),
            check_in_lat=check_in_lat,
            check_in_long=check_in_long,
            punchin_verification=verified_status,
        )

        return Response(
            {"message": response_message, "data": AttendanceSerializer(attendance).data},
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"Punch-in error: {str(e)}", exc_info=True)
        return Response(
            {"error": "An unexpected error occurred during punch-in"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def punch_out(request):
    try:
        try:
            employee = request.user.employee
        except Exception:
            return Response(
                {"error": "Employee profile not found for this user"},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data

        if not all(field in data for field in ['check_out_lat', 'check_out_long']):
            return Response({"error": "Missing required location fields"}, status=status.HTTP_400_BAD_REQUEST)

        if 'photo_check_out' not in request.FILES:
            return Response({"error": "Photo is required for punch-out"}, status=status.HTTP_400_BAD_REQUEST)

        photo_file = request.FILES.get('photo_check_out')

        # Only close today's open record — never one from a prior day.
        today = timezone.localdate()
        attendance = Attendance.objects.filter(
            employee=employee,
            date=today,
            check_out_time__isnull=True,
        ).order_by('-check_in_time').first()

        if not attendance:
            return Response(
                {"error": "No active punch-in session found for today"},
                status=400,
            )

        if not employee.reference_photo:
            return Response({"error": "Reference photo missing. Contact admin."}, status=400)

        try:
            check_out_lat = float(data.get('check_out_lat'))
            check_out_long = float(data.get('check_out_long'))
        except (TypeError, ValueError):
            return Response({"error": "Invalid latitude or longitude"}, status=status.HTTP_400_BAD_REQUEST)

        if not verify_location(employee, check_out_lat, check_out_long):
            return Response(
                {"error": "You're not at an allowed location for punch-out"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            employee.reference_photo.open('rb')
            source_bytes = employee.reference_photo.read()
            employee.reference_photo.close()

            target_bytes = photo_file.read()

            result = compare_faces(
                source_bytes=source_bytes,
                target_bytes=target_bytes,
                aws_access_key=settings.AWS_ACCESS_KEY_ID,
                aws_secret_key=settings.AWS_SECRET_ACCESS_KEY,
                aws_region=settings.AWS_REKOGNITION_REGION,
            )

            if not result.get('FaceMatches'):
                return Response({"error": "Face recognition failed. Please try again."}, status=401)

        except Exception as e:
            logger.error(f"Face comparison error during punch-out for employee {employee.employee_id}: {str(e)}")
            return Response(
                {"error": "Could not process image. Ensure your face is clearly visible."},
                status=400,
            )

        employee.punchout_selfie = photo_file
        employee.save()

        attendance.check_out_time = timezone.now()
        attendance.check_out_lat = check_out_lat
        attendance.check_out_long = check_out_long
        attendance.punchout_verification = "Verified"
        attendance.save()

        return Response(
            {"message": "Punch-out recorded successfully!", "data": AttendanceSerializer(attendance).data},
            status=200,
        )

    except Exception as e:
        logger.error(f"Punch-out error: {str(e)}", exc_info=True)
        return Response({"error": "An error occurred during punch-out"}, status=500)
