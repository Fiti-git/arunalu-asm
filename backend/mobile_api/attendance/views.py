import logging

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from main.models import Attendance, EmpLeave
from main.utils import verify_location
from attendance.face_recognition import compare_faces
from .serializers import MobileAttendanceSerializer

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_attendance(request):
    """Return today's open attendance record (check_out_time is null), if any."""
    try:
        employee = request.user.employee
    except Exception:
        return Response({"error": "Employee profile not found"}, status=403)

    record = Attendance.objects.filter(
        employee=employee,
        date=timezone.now().date(),
        check_out_time__isnull=True,
    ).last()

    if record:
        check_in_local = timezone.localtime(record.check_in_time)
        return Response({
            "punched_in": True,
            "check_in_time": check_in_local.strftime("%H:%M"),
            "attendance_id": record.attendance_id,
        })
    return Response({"punched_in": False})


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

        open_attendance = Attendance.objects.filter(
            employee=employee,
            check_out_time__isnull=True,
        ).last()

        if open_attendance:
            return Response(
                {"error": "You must punch out from your previous session before punching in again"},
                status=400,
            )

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
            {"message": response_message, "data": MobileAttendanceSerializer(attendance).data},
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

        attendance = Attendance.objects.filter(
            employee=employee,
            check_out_time__isnull=True,
        ).last()

        if not attendance:
            return Response({"error": "No active punch-in session found"}, status=400)

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
            {"message": "Punch-out recorded successfully!", "data": MobileAttendanceSerializer(attendance).data},
            status=200,
        )

    except Exception as e:
        logger.error(f"Punch-out error: {str(e)}", exc_info=True)
        return Response({"error": "An error occurred during punch-out"}, status=500)
