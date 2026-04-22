from decimal import Decimal
from datetime import datetime, timedelta, date

from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from main.models import Attendance, Employee, EmpLeave, LeaveType, Holiday
from .models import (
    EmployeeSalary, PaymentVoucher, VoucherAllowance, VoucherDeduction,
    EmployeeOutletAllocation,
)
from .serializers import (
    EmployeeSalarySerializer, PaymentVoucherSerializer,
)
from .services import split_voucher_by_outlet


# =============================================================================
# Access control
# =============================================================================

def _is_payroll_user(user):
    """Admin OR 'Acc' group can use the calculation module."""
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    return user.groups.filter(name__in=["Admin", "Acc", "acc", "ACC"]).exists()


def _is_admin_user(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    return user.groups.filter(name__iexact="Admin").exists()


def _gate_payroll(request):
    if not _is_payroll_user(request.user):
        return Response({"error": "You don't have access to payroll."}, status=403)
    return None


# =============================================================================
# Computation helpers
# =============================================================================

def _parse_date(raw):
    if isinstance(raw, date):
        return raw
    return datetime.strptime(str(raw), "%Y-%m-%d").date()


def _days_in_range(sd, ed):
    out = []
    d = sd
    while d <= ed:
        out.append(d)
        d += timedelta(days=1)
    return out


def _compute_summary(employee, sd, ed, salary):
    """Crunch attendance + leave + holidays for the period.
    Returns a dict of raw counts + suggested pay figures."""
    per_day = Decimal(salary.per_day_salary or 0)
    per_hour_ot = Decimal(salary.per_hour_ot_rate or 0)

    att = {
        a.date: a for a in Attendance.objects
        .filter(employee=employee, date__range=[sd, ed])
    }
    leaves_qs = (EmpLeave.objects
                 .filter(employee=employee, leave_date__range=[sd, ed],
                         status__iexact="approved")
                 .select_related("leave_type"))
    leaves = {lv.leave_date: lv for lv in leaves_qs}
    holidays = {h.hdate: h for h in Holiday.objects.filter(active=True, hdate__range=[sd, ed])}

    days_present = Decimal(0)
    days_late = Decimal(0)
    days_half = Decimal(0)
    days_leave = Decimal(0)
    days_absent = Decimal(0)
    holiday_work_days = Decimal(0)
    ot_hours = Decimal(0)

    regular_pay = Decimal(0)
    ot_pay = Decimal(0)
    holiday_pay = Decimal(0)
    leave_pay = Decimal(0)

    daily_lines = []

    for d in _days_in_range(sd, ed):
        a = att.get(d)
        lv = leaves.get(d)
        hol = holidays.get(d)

        line = {"date": d.isoformat(), "holiday": hol.holiday_name if hol else None,
                "pay": 0, "note": ""}

        if a:
            s = (a.status or "").lower()
            hrs_ot = Decimal(a.ot_hours or 0)
            ot_hours += hrs_ot

            day_pay = Decimal(0)
            if s == "half day":
                days_half += 1
                day_pay = per_day / 2
                line["note"] = "Half Day"
            elif s in ("present", "late", "1"):
                if s == "late":
                    days_late += 1
                    line["note"] = "Late"
                else:
                    days_present += 1
                    line["note"] = "Present"
                day_pay = per_day
            else:
                # has row but marked absent/on leave — treat based on status
                days_absent += 1
                line["note"] = a.status

            this_ot_pay = hrs_ot * per_hour_ot

            if hol and day_pay > 0:
                holiday_work_days += 1
                reg_pct = Decimal(hol.holiday_regular_pay_percentage or 100) / 100
                ot_pct = Decimal(hol.holiday_ot_pay_percentage or 100) / 100
                boosted_reg = day_pay * reg_pct
                boosted_ot = this_ot_pay * ot_pct
                holiday_pay += boosted_reg + boosted_ot
                line["note"] = f"Holiday worked ({hol.holiday_name})"
                line["pay"] = float(boosted_reg + boosted_ot)
            else:
                regular_pay += day_pay
                ot_pay += this_ot_pay
                line["pay"] = float(day_pay + this_ot_pay)

        elif lv:
            days_leave += 1
            pct = Decimal(lv.leave_type.pay_percentage or 0) / 100 if lv.leave_type else Decimal(0)
            pay = per_day * pct
            leave_pay += pay
            line["note"] = f"Leave: {lv.leave_type.att_type_name if lv.leave_type else '—'} ({pct*100}%)"
            line["pay"] = float(pay)
        elif hol:
            line["note"] = f"Holiday: {hol.holiday_name}"
        else:
            days_absent += 1
            line["note"] = "Absent"

        daily_lines.append(line)

    return {
        "per_day_rate": float(per_day),
        "per_hour_ot_rate": float(per_hour_ot),
        "expected_hours_per_day": float(salary.expected_hours_per_day or 8),
        "days_present": float(days_present),
        "days_late": float(days_late),
        "days_half": float(days_half),
        "days_leave": float(days_leave),
        "days_absent": float(days_absent),
        "holiday_work_days": float(holiday_work_days),
        "ot_hours": float(ot_hours),
        "regular_pay": float(regular_pay),
        "ot_pay": float(ot_pay),
        "holiday_pay": float(holiday_pay),
        "leave_pay": float(leave_pay),
        "gross_core": float(regular_pay + ot_pay + holiday_pay + leave_pay),
        "daily_lines": daily_lines,
    }


def _employee_details(emp):
    outlet_ids = list(emp.outlets.values_list("id", "name"))
    return {
        "employee_id": emp.employee_id,
        "fullname": emp.fullname,
        "empcode": emp.empcode,
        "idnumber": emp.idnumber,
        "phone_number": emp.phone_number,
        "date_of_birth": emp.date_of_birth.isoformat() if emp.date_of_birth else None,
        "email": emp.user.email if emp.user_id else "",
        "is_active": emp.is_active,
        "primary_outlet_id": emp.primary_outlet_id,
        "primary_outlet_name": emp.primary_outlet.name if emp.primary_outlet_id else None,
        "outlets": [{"id": i, "name": n} for (i, n) in outlet_ids],
        "reference_photo": emp.reference_photo.url if emp.reference_photo else None,
        "basic_salary": float(emp.basic_salary) if emp.basic_salary is not None else 0,
        "cal_epf": bool(emp.cal_epf),
        "epf_number": emp.epf_number,
        "epf_grade": emp.epf_grade,
        "epf_com_per": float(emp.epf_com_per or 12),
        "epf_emp_per": float(emp.epf_emp_per or 8),
        "etf_com_per": float(emp.etf_com_per or 3),
    }


# =============================================================================
# Salary profile
# =============================================================================

class EmployeeSalaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, employee_id):
        gate = _gate_payroll(request)
        if gate: return gate
        emp = get_object_or_404(Employee, pk=employee_id)
        salary, _ = EmployeeSalary.objects.get_or_create(employee=emp, defaults={
            "per_day_salary": (emp.basic_salary or 0) / 30 if emp.basic_salary else 0,
            "per_hour_ot_rate": ((emp.basic_salary or 0) / 30 / 8) * 1.5 if emp.basic_salary else 0,
        })
        return Response(EmployeeSalarySerializer(salary).data)

    def patch(self, request, employee_id):
        gate = _gate_payroll(request)
        if gate: return gate
        emp = get_object_or_404(Employee, pk=employee_id)
        salary, _ = EmployeeSalary.objects.get_or_create(employee=emp)
        ser = EmployeeSalarySerializer(salary, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


# =============================================================================
# Preview — compute without saving
# =============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def voucher_preview(request, employee_id):
    gate = _gate_payroll(request)
    if gate: return gate
    try:
        sd = _parse_date(request.GET.get("start_date"))
        ed = _parse_date(request.GET.get("end_date"))
    except (TypeError, ValueError):
        return Response({"error": "start_date and end_date are required (YYYY-MM-DD)."}, status=400)
    if ed < sd:
        return Response({"error": "end_date must be on or after start_date."}, status=400)

    emp = get_object_or_404(Employee, pk=employee_id)
    salary, _ = EmployeeSalary.objects.get_or_create(employee=emp)
    summary = _compute_summary(emp, sd, ed, salary)

    return Response({
        "employee": _employee_details(emp),
        "period_start": sd.isoformat(),
        "period_end": ed.isoformat(),
        "summary": summary,
    })


# =============================================================================
# Voucher CRUD
# =============================================================================

class PaymentVoucherListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        gate = _gate_payroll(request)
        if gate: return gate
        qs = PaymentVoucher.objects.select_related("employee", "employee__primary_outlet")
        emp_id = request.GET.get("employee_id")
        if emp_id:
            qs = qs.filter(employee_id=emp_id)
        status_f = request.GET.get("status")
        if status_f and status_f != "all":
            qs = qs.filter(status=status_f)
        return Response(PaymentVoucherSerializer(qs, many=True).data)

    def post(self, request):
        """Create a Draft voucher pre-populated from the compute summary."""
        gate = _gate_payroll(request)
        if gate: return gate

        data = request.data
        try:
            emp_id = int(data.get("employee_id"))
            sd = _parse_date(data.get("period_start"))
            ed = _parse_date(data.get("period_end"))
        except (TypeError, ValueError):
            return Response({"error": "employee_id, period_start, period_end are required."}, status=400)

        emp = get_object_or_404(Employee, pk=emp_id)
        existing = PaymentVoucher.objects.filter(
            employee=emp, period_start=sd, period_end=ed,
        ).first()
        if existing:
            return Response(
                {"error": f"A voucher already exists for {sd} .. {ed}.", "voucher_id": existing.id},
                status=400,
            )

        salary, _ = EmployeeSalary.objects.get_or_create(employee=emp)
        summary = _compute_summary(emp, sd, ed, salary)

        voucher = PaymentVoucher.objects.create(
            employee=emp,
            period_start=sd,
            period_end=ed,
            status="Draft",
            per_day_rate_used=Decimal(summary["per_day_rate"]),
            per_hour_ot_rate_used=Decimal(summary["per_hour_ot_rate"]),
            expected_hours_per_day=Decimal(summary["expected_hours_per_day"]),
            days_present=Decimal(summary["days_present"]),
            days_late=Decimal(summary["days_late"]),
            days_half=Decimal(summary["days_half"]),
            days_leave=Decimal(summary["days_leave"]),
            days_absent=Decimal(summary["days_absent"]),
            holiday_work_days=Decimal(summary["holiday_work_days"]),
            ot_hours=Decimal(summary["ot_hours"]),
            regular_pay=Decimal(summary["regular_pay"]),
            ot_pay=Decimal(summary["ot_pay"]),
            holiday_pay=Decimal(summary["holiday_pay"]),
            leave_pay=Decimal(summary["leave_pay"]),
            basic_for_epf=Decimal(emp.basic_salary or 0),
            epf_employee_pct=Decimal(emp.epf_emp_per or 8),
            epf_company_pct=Decimal(emp.epf_com_per or 12),
            etf_company_pct=Decimal(emp.etf_com_per or 3),
            generated_by=request.user,
        )
        _recompute_totals(voucher)
        return Response(PaymentVoucherSerializer(voucher).data, status=201)


def _recompute_totals(voucher):
    """Roll up allowance/deduction/EPF into gross + net; save voucher."""
    alw = sum((a.amount for a in voucher.allowances.all()), Decimal(0))
    ded = sum((d.amount for d in voucher.deductions.all()), Decimal(0))
    voucher.allowance_total = alw
    voucher.deduction_total = ded

    voucher.gross_pay = (
        voucher.regular_pay + voucher.ot_pay + voucher.holiday_pay +
        voucher.leave_pay + alw
    )

    base = voucher.basic_for_epf or Decimal(0)
    voucher.epf_employee_deduction = (base * voucher.epf_employee_pct) / 100
    voucher.epf_company_contribution = (base * voucher.epf_company_pct) / 100
    voucher.etf_company_contribution = (base * voucher.etf_company_pct) / 100

    voucher.net_pay = voucher.gross_pay - ded - voucher.epf_employee_deduction
    voucher.save()


class PaymentVoucherDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        gate = _gate_payroll(request)
        if gate: return gate
        voucher = get_object_or_404(
            PaymentVoucher.objects.select_related("employee", "employee__primary_outlet"),
            pk=pk,
        )
        return Response(PaymentVoucherSerializer(voucher).data)

    def patch(self, request, pk):
        gate = _gate_payroll(request)
        if gate: return gate
        voucher = get_object_or_404(PaymentVoucher, pk=pk)
        if voucher.status == "Locked":
            return Response({"error": "Voucher is locked. Unlock to edit."}, status=400)

        data = request.data
        editable = [
            "per_day_rate_used", "per_hour_ot_rate_used", "expected_hours_per_day",
            "days_present", "days_late", "days_half", "days_leave", "days_absent",
            "holiday_work_days", "ot_hours",
            "regular_pay", "ot_pay", "holiday_pay", "leave_pay",
            "basic_for_epf", "epf_employee_pct", "epf_company_pct", "etf_company_pct",
            "notes",
        ]
        for field in editable:
            if field in data and data[field] is not None:
                setattr(voucher, field, Decimal(str(data[field])) if field != "notes" else str(data[field]))

        with transaction.atomic():
            # Replace allowances / deductions atomically
            if "allowances" in data and isinstance(data["allowances"], list):
                voucher.allowances.all().delete()
                for a in data["allowances"]:
                    VoucherAllowance.objects.create(
                        voucher=voucher,
                        label=str(a.get("label", "")).strip() or "Allowance",
                        amount=Decimal(str(a.get("amount", 0))),
                    )
            if "deductions" in data and isinstance(data["deductions"], list):
                voucher.deductions.all().delete()
                for d in data["deductions"]:
                    VoucherDeduction.objects.create(
                        voucher=voucher,
                        label=str(d.get("label", "")).strip() or "Deduction",
                        amount=Decimal(str(d.get("amount", 0))),
                    )
            _recompute_totals(voucher)

        return Response(PaymentVoucherSerializer(voucher).data)

    def delete(self, request, pk):
        """Delete a Draft voucher. Locked vouchers can't be deleted."""
        gate = _gate_payroll(request)
        if gate: return gate
        voucher = get_object_or_404(PaymentVoucher, pk=pk)
        if voucher.status == "Locked":
            return Response({"error": "Locked vouchers cannot be deleted."}, status=400)
        voucher.delete()
        return Response({"message": "Deleted."}, status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def voucher_lock(request, pk):
    gate = _gate_payroll(request)
    if gate: return gate
    voucher = get_object_or_404(PaymentVoucher, pk=pk)
    if voucher.status == "Locked":
        return Response({"error": "Already locked."}, status=400)
    _recompute_totals(voucher)
    voucher.status = "Locked"
    voucher.locked_by = request.user
    voucher.locked_at = timezone.now()
    voucher.save()
    return Response(PaymentVoucherSerializer(voucher).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def voucher_unlock(request, pk):
    """Unlock is admin-only."""
    if not _is_admin_user(request.user):
        return Response({"error": "Only admins can unlock vouchers."}, status=403)
    voucher = get_object_or_404(PaymentVoucher, pk=pk)
    if voucher.status != "Locked":
        return Response({"error": "Voucher is not locked."}, status=400)
    voucher.status = "Draft"
    voucher.locked_by = None
    voucher.locked_at = None
    voucher.save()
    return Response(PaymentVoucherSerializer(voucher).data)


# =============================================================================
# Employee listing for the payroll hub
# =============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payroll_employee_list(request):
    """List active employees with their latest voucher status, filterable by outlet + period."""
    gate = _gate_payroll(request)
    if gate: return gate

    qs = Employee.objects.filter(is_active=True).select_related("primary_outlet").order_by("fullname")
    outlet_id = request.GET.get("outlet_id")
    if outlet_id:
        try:
            qs = qs.filter(primary_outlet_id=int(outlet_id))
        except (TypeError, ValueError):
            return Response({"error": "Invalid outlet_id"}, status=400)

    period_start = request.GET.get("period_start")
    period_end = request.GET.get("period_end")

    result = []
    for e in qs:
        latest_qs = PaymentVoucher.objects.filter(employee=e).order_by("-period_end")
        if period_start and period_end:
            latest_qs = latest_qs.filter(period_start=period_start, period_end=period_end)
        latest = latest_qs.first()
        result.append({
            "employee_id": e.employee_id,
            "fullname": e.fullname,
            "empcode": e.empcode,
            "primary_outlet_id": e.primary_outlet_id,
            "primary_outlet_name": e.primary_outlet.name if e.primary_outlet_id else None,
            "basic_salary": float(e.basic_salary) if e.basic_salary is not None else 0,
            "voucher_id": latest.id if latest else None,
            "voucher_status": latest.status if latest else None,
            "voucher_net_pay": float(latest.net_pay) if latest else None,
            "voucher_period_start": latest.period_start.isoformat() if latest else None,
            "voucher_period_end": latest.period_end.isoformat() if latest else None,
        })
    return Response(result)


# =============================================================================
# Outlet allocation management
# =============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def allocation_list(request):
    """List all employees (optionally filtered by outlet) with their current
    outlet allocations. Useful for the admin allocation editor."""
    gate = _gate_payroll(request)
    if gate: return gate

    qs = (Employee.objects.filter(is_active=True)
          .prefetch_related("outlets", "outlet_allocations__outlet")
          .select_related("primary_outlet")
          .order_by("fullname"))

    outlet_id = request.GET.get("outlet")
    if outlet_id:
        try:
            qs = qs.filter(outlets__id=int(outlet_id)).distinct()
        except (TypeError, ValueError):
            return Response({"error": "Invalid outlet"}, status=400)

    only_multi = request.GET.get("multi_only", "").lower() in ("1", "true", "yes")

    result = []
    for e in qs:
        outlets = list(e.outlets.all())
        if only_multi and len(outlets) < 2:
            continue
        rows = list(e.outlet_allocations.all())
        allocations = [
            {
                "outlet_id": r.outlet_id,
                "outlet_name": r.outlet.name,
                "percentage": float(r.percentage),
            }
            for r in rows
        ]
        result.append({
            "employee_id": e.employee_id,
            "fullname": e.fullname,
            "empcode": e.empcode,
            "primary_outlet_id": e.primary_outlet_id,
            "primary_outlet_name": e.primary_outlet.name if e.primary_outlet_id else None,
            "outlets": [{"id": o.id, "name": o.name} for o in outlets],
            "allocations": allocations,
            "has_explicit": len(allocations) > 0,
        })
    return Response(result)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def allocation_set(request, employee_id):
    """Bulk-set allocations for one employee. Body: [{outlet_id, percentage}, ...].
    Sum must equal 100 (allowing 0.01 tolerance). All outlets must be in
    employee.outlets. Replaces any existing rows atomically."""
    if not _is_admin_user(request.user):
        return Response({"error": "Only admins can edit allocations."}, status=403)

    emp = get_object_or_404(Employee, pk=employee_id)
    payload = request.data
    if not isinstance(payload, list):
        return Response({"error": "Body must be a list."}, status=400)

    valid_outlet_ids = set(emp.outlets.values_list("id", flat=True))
    cleaned = []
    total = Decimal(0)
    seen = set()
    for item in payload:
        try:
            oid = int(item.get("outlet_id"))
            pct = Decimal(str(item.get("percentage")))
        except (TypeError, ValueError, AttributeError):
            return Response({"error": "Each entry needs outlet_id and percentage."}, status=400)
        if oid not in valid_outlet_ids:
            return Response({"error": f"Outlet {oid} is not assigned to this employee."}, status=400)
        if oid in seen:
            return Response({"error": f"Outlet {oid} listed more than once."}, status=400)
        if pct < 0 or pct > 100:
            return Response({"error": "Percentage must be between 0 and 100."}, status=400)
        seen.add(oid)
        total += pct
        cleaned.append((oid, pct))

    if cleaned and abs(total - Decimal("100")) > Decimal("0.01"):
        return Response({"error": f"Percentages must sum to 100 (got {total})."}, status=400)

    with transaction.atomic():
        EmployeeOutletAllocation.objects.filter(employee=emp).delete()
        for oid, pct in cleaned:
            EmployeeOutletAllocation.objects.create(
                employee=emp, outlet_id=oid, percentage=pct,
            )

    rows = [
        {"outlet_id": r.outlet_id, "outlet_name": r.outlet.name, "percentage": float(r.percentage)}
        for r in emp.outlet_allocations.select_related("outlet").all()
    ]
    return Response({"employee_id": emp.employee_id, "allocations": rows})


# =============================================================================
# Payroll report helpers
# =============================================================================

def _parse_month(month_str):
    """Accept 'YYYY-MM'. Return (first_day, last_day) as date objects."""
    from calendar import monthrange
    if not month_str:
        today = date.today()
        y, m = today.year, today.month
    else:
        try:
            y, m = [int(x) for x in month_str.split("-")[:2]]
        except (ValueError, AttributeError):
            return None, None
    last = monthrange(y, m)[1]
    return date(y, m, 1), date(y, m, last)


def _vouchers_for_month(month_str, outlet_id=None):
    """Return locked vouchers whose period overlaps the month."""
    sd, ed = _parse_month(month_str)
    if sd is None:
        return None, None, None

    qs = (PaymentVoucher.objects
          .filter(status="Locked", period_start__lte=ed, period_end__gte=sd)
          .select_related("employee", "employee__primary_outlet")
          .prefetch_related("employee__outlets", "employee__outlet_allocations__outlet"))

    if outlet_id:
        try:
            oid = int(outlet_id)
            qs = qs.filter(employee__outlets__id=oid).distinct()
        except (TypeError, ValueError):
            return None, None, None

    return qs, sd, ed


# =============================================================================
# Payroll report endpoints
# =============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payroll_report_employees(request):
    """Per-employee salary list for a given month."""
    gate = _gate_payroll(request)
    if gate: return gate

    vouchers, sd, ed = _vouchers_for_month(request.GET.get("month"), request.GET.get("outlet"))
    if vouchers is None:
        return Response({"error": "Invalid month (use YYYY-MM)."}, status=400)

    rows = []
    totals = {"gross": Decimal(0), "epf_emp": Decimal(0), "epf_com": Decimal(0),
              "etf_com": Decimal(0), "net": Decimal(0)}

    for v in vouchers:
        emp = v.employee
        outlets = ", ".join(o.name for o in emp.outlets.all())
        rows.append({
            "voucher_id": v.id,
            "employee_id": emp.employee_id,
            "empcode": emp.empcode,
            "fullname": emp.fullname,
            "primary_outlet_name": emp.primary_outlet.name if emp.primary_outlet_id else None,
            "outlets": outlets,
            "period_start": v.period_start.isoformat(),
            "period_end": v.period_end.isoformat(),
            "gross_pay": float(v.gross_pay),
            "epf_employee_deduction": float(v.epf_employee_deduction),
            "epf_company_contribution": float(v.epf_company_contribution),
            "etf_company_contribution": float(v.etf_company_contribution),
            "deduction_total": float(v.deduction_total),
            "net_pay": float(v.net_pay),
        })
        totals["gross"] += v.gross_pay
        totals["epf_emp"] += v.epf_employee_deduction
        totals["epf_com"] += v.epf_company_contribution
        totals["etf_com"] += v.etf_company_contribution
        totals["net"] += v.net_pay

    return Response({
        "month_start": sd.isoformat(),
        "month_end": ed.isoformat(),
        "rows": rows,
        "totals": {k: float(v) for k, v in totals.items()},
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payroll_report_outlet_summary(request):
    """Total salary cost per outlet for a given month, after allocation split."""
    gate = _gate_payroll(request)
    if gate: return gate

    vouchers, sd, ed = _vouchers_for_month(request.GET.get("month"), request.GET.get("outlet"))
    if vouchers is None:
        return Response({"error": "Invalid month (use YYYY-MM)."}, status=400)

    agg = {}  # outlet_id -> {name, total, employee_ids}
    for v in vouchers:
        for part in split_voucher_by_outlet(v):
            oid = part["outlet_id"]
            bucket = agg.setdefault(oid, {
                "outlet_id": oid,
                "outlet_name": part["outlet_name"],
                "total_cost": 0.0,
                "employee_ids": set(),
            })
            bucket["total_cost"] += part["amount"]
            bucket["employee_ids"].add(v.employee_id)

    rows = []
    grand = 0.0
    for b in agg.values():
        rows.append({
            "outlet_id": b["outlet_id"],
            "outlet_name": b["outlet_name"],
            "employee_count": len(b["employee_ids"]),
            "total_cost": round(b["total_cost"], 2),
        })
        grand += b["total_cost"]
    rows.sort(key=lambda r: r["outlet_name"])

    return Response({
        "month_start": sd.isoformat(),
        "month_end": ed.isoformat(),
        "rows": rows,
        "grand_total": round(grand, 2),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payroll_report_multi_outlet(request):
    """Per-outlet split lines for employees assigned to >1 outlet."""
    gate = _gate_payroll(request)
    if gate: return gate

    vouchers, sd, ed = _vouchers_for_month(request.GET.get("month"), request.GET.get("outlet"))
    if vouchers is None:
        return Response({"error": "Invalid month (use YYYY-MM)."}, status=400)

    rows = []
    for v in vouchers:
        emp = v.employee
        emp_outlets = list(emp.outlets.all())
        if len(emp_outlets) < 2:
            continue
        for part in split_voucher_by_outlet(v):
            rows.append({
                "voucher_id": v.id,
                "employee_id": emp.employee_id,
                "empcode": emp.empcode,
                "fullname": emp.fullname,
                "net_pay": float(v.net_pay),
                "outlet_id": part["outlet_id"],
                "outlet_name": part["outlet_name"],
                "percentage": part["percentage"],
                "amount": part["amount"],
            })
    rows.sort(key=lambda r: (r["fullname"], r["outlet_name"]))

    return Response({
        "month_start": sd.isoformat(),
        "month_end": ed.isoformat(),
        "rows": rows,
    })


# =============================================================================
# Excel export
# =============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payroll_report_export(request):
    """Export a payroll report tab as .xlsx.
    Query: tab=employees|outlet-summary|multi-outlet, month=YYYY-MM, outlet=<id>?"""
    gate = _gate_payroll(request)
    if gate: return gate

    import io
    from openpyxl import Workbook
    from django.http import HttpResponse

    tab = request.GET.get("tab", "employees")
    month = request.GET.get("month")
    outlet_id = request.GET.get("outlet")

    vouchers, sd, ed = _vouchers_for_month(month, outlet_id)
    if vouchers is None:
        return Response({"error": "Invalid month."}, status=400)

    wb = Workbook()
    ws = wb.active
    month_label = sd.strftime("%Y-%m") if sd else ""

    if tab == "employees":
        ws.title = "Per-Employee"
        ws.append(["Emp Code", "Name", "Outlets", "Period",
                   "Gross", "EPF (Emp)", "EPF (Com)", "ETF (Com)", "Deductions", "Net"])
        for v in vouchers:
            emp = v.employee
            ws.append([
                emp.empcode,
                emp.fullname,
                ", ".join(o.name for o in emp.outlets.all()),
                f"{v.period_start} .. {v.period_end}",
                float(v.gross_pay),
                float(v.epf_employee_deduction),
                float(v.epf_company_contribution),
                float(v.etf_company_contribution),
                float(v.deduction_total),
                float(v.net_pay),
            ])
        filename = f"payroll_employees_{month_label}.xlsx"

    elif tab == "outlet-summary":
        ws.title = "Outlet Summary"
        ws.append(["Outlet", "Employees", "Total Cost"])
        agg = {}
        for v in vouchers:
            for part in split_voucher_by_outlet(v):
                oid = part["outlet_id"]
                bucket = agg.setdefault(oid, {"name": part["outlet_name"],
                                              "total": 0.0, "emps": set()})
                bucket["total"] += part["amount"]
                bucket["emps"].add(v.employee_id)
        for oid, b in sorted(agg.items(), key=lambda kv: kv[1]["name"]):
            ws.append([b["name"], len(b["emps"]), round(b["total"], 2)])
        filename = f"payroll_outlet_summary_{month_label}.xlsx"

    elif tab == "multi-outlet":
        ws.title = "Multi-Outlet Split"
        ws.append(["Emp Code", "Name", "Net Pay", "Outlet", "Percentage", "Amount"])
        for v in vouchers:
            emp = v.employee
            if emp.outlets.count() < 2:
                continue
            for part in split_voucher_by_outlet(v):
                ws.append([
                    emp.empcode, emp.fullname, float(v.net_pay),
                    part["outlet_name"], part["percentage"], part["amount"],
                ])
        filename = f"payroll_multi_outlet_{month_label}.xlsx"

    else:
        return Response({"error": "Unknown tab."}, status=400)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    resp = HttpResponse(
        buf.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp