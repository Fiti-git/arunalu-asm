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

    leave_types = list(LeaveType.objects.filter(active=True))
    all_leaves = list(
        EmpLeave.objects
        .filter(employee=employee, status__in=['pending', 'approved'])
        .values('leave_type_id', 'leave_date')
    )

    result = []
    for lt in leave_types:
        used_count = sum(
            1 for lv in all_leaves
            if lv['leave_type_id'] == lt.id
            and lt.year_start_date <= lv['leave_date'] <= lt.year_end_date
        )
        allowed = lt.att_type_no_of_days_in_year or 0
        result.append({
            'id': lt.id,
            'leave_type': lt.att_type_name,
            'leave_code': lt.att_type,
            'allowed': allowed,
            'used': used_count,
            'remaining': max(allowed - used_count, 0),
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

        today = date.today()
        # Parse and validate all dates up front — reject the whole batch if
        # any single date is malformed, in the past, or too far in the future.
        parsed_dates = []
        for date_str in leave_dates:
            try:
                d = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {'error': f'Invalid date format: {date_str}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if d < today:
                return Response(
                    {'error': f'Leave date {date_str} is in the past.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if (d - today).days > 365:
                return Response(
                    {'error': f'Leave date {date_str} is more than a year away.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            parsed_dates.append(d)

        # Reject any date already covered by an existing pending/approved
        # leave for this employee.
        existing = set(
            EmpLeave.objects
            .filter(
                employee=employee,
                leave_date__in=parsed_dates,
                status__in=['pending', 'approved'],
            )
            .values_list('leave_date', flat=True)
        )
        if existing:
            dupes = sorted({d.isoformat() for d in existing})
            return Response(
                {'error': f'Leave already exists for: {", ".join(dupes)}'},
                status=status.HTTP_409_CONFLICT,
            )

        # Balance check: existing usage + this batch must not exceed allowance.
        allowed = leave_type.att_type_no_of_days_in_year or 0
        used = EmpLeave.objects.filter(
            employee=employee,
            leave_type=leave_type,
            status__in=['pending', 'approved'],
            leave_date__range=(leave_type.year_start_date, leave_type.year_end_date),
        ).count()
        if allowed and used + len(parsed_dates) > allowed:
            return Response(
                {'error': f'Leave balance exceeded ({used} used, {allowed} allowed).'},
                status=status.HTTP_409_CONFLICT,
            )

        created = []
        for leave_date in parsed_dates:
            obj = EmpLeave.objects.create(
                employee=employee,
                leave_date=leave_date,
                leave_type=leave_type,
                remarks=remarks,
                status='pending',
            )
            created.append(obj.leave_refno)

        return Response(
            {'message': 'Leave requests submitted.', 'created_ids': created},
            status=status.HTTP_201_CREATED,
        )
