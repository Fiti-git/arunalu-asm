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
from .models import EmployeeSalary, PaymentVoucher, VoucherAllowance, VoucherDeduction
from .serializers import (
    EmployeeSalarySerializer, PaymentVoucherSerializer,
)


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