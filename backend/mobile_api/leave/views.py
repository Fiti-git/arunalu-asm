from datetime import datetime, date

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from main.models import EmpLeave, LeaveType
from .serializers import MobileEmpLeaveSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_leave_requests(request):
    leave_requests = EmpLeave.objects.filter(employee=request.user.employee)
    serializer = MobileEmpLeaveSerializer(leave_requests, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_leave(request):
    employee = request.user.employee
    result = []

    leave_types = LeaveType.objects.filter(active=True)

    for leave_type in leave_types:
        start_date = leave_type.year_start_date
        end_date = leave_type.year_end_date

        used_count = EmpLeave.objects.filter(
            employee=employee,
            leave_type=leave_type,
            status__in=['pending', 'approved'],
            leave_date__range=(start_date, end_date),
        ).count()

        allowed = leave_type.att_type_no_of_days_in_year
        remaining = max(allowed - used_count, 0)

        result.append({
            'id': leave_type.id,
            'leave_type': leave_type.att_type_name,
            'leave_code': leave_type.att_type,
            'allowed': allowed,
            'used': used_count,
            'remaining': remaining,
        })

    return Response(result)


class ApplyLeaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        employee = request.user.employee

        leave_type_id = request.data.get('leave_type')
        leave_dates = request.data.get('leave_dates')
        remarks = request.data.get('remarks', '')

        if not leave_type_id or not leave_dates:
            return Response(
                {'error': 'leave_type and leave_dates are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            leave_type = LeaveType.objects.get(id=leave_type_id)
        except LeaveType.DoesNotExist:
            return Response({'error': 'Invalid leave_type.'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        for date_str in leave_dates:
            try:
                leave_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                obj = EmpLeave.objects.create(
                    employee=employee,
                    leave_date=leave_date,
                    leave_type=leave_type,
                    remarks=remarks,
                    status='pending',
                )
                created.append(obj.leave_refno)
            except ValueError:
                return Response(
                    {'error': f'Invalid date format: {date_str}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {'message': 'Leave requests submitted.', 'created_ids': created},
            status=status.HTTP_201_CREATED,
        )
