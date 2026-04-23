"""Payroll calculation engine.

Given (employee, period), returns a snapshot dict used to populate Payroll rows.
Pulls attendance, leave, holiday records and applies Sri Lankan-aware rules:
  * expected hours per day from WorkSchedule (Mon–Sun template)
  * OT at ot_multiplier beyond scheduled day hours
  * Holiday work: base pay × holiday_multiplier, OT × holiday_multiplier
  * Leave pay = per_day_rate × leave_type.pay_percentage / 100
  * Attendance score drives bonus tier selection
"""
from decimal import Decimal
from datetime import timedelta

from main.models import Attendance, Holiday, EmpLeave
from .models import WorkSchedule, AttendanceBonusTier, APITSlab


ZERO = Decimal("0")
HUNDRED = Decimal("100")


def _dec(v):
    if v is None:
        return ZERO
    return Decimal(str(v))


def _days_in_range(sd, ed):
    d = sd
    while d <= ed:
        yield d
        d += timedelta(days=1)


def get_or_default_schedule(employee):
    """Return the employee's WorkSchedule, or an unsaved default (8/8/8/8/8/6/0)."""
    try:
        return employee.work_schedule
    except WorkSchedule.DoesNotExist:
        return WorkSchedule(
            employee=employee,
            mon_hours=8, tue_hours=8, wed_hours=8, thu_hours=8, fri_hours=8,
            sat_hours=6, sun_hours=0,
            ot_multiplier=Decimal("1.5"),
            holiday_multiplier=Decimal("2.0"),
        )


def match_bonus(score_pct):
    """Return (tier, bonus_amount) or (None, 0) if no match."""
    for tier in AttendanceBonusTier.objects.filter(is_active=True).order_by("-min_pct"):
        if _dec(tier.min_pct) <= score_pct <= _dec(tier.max_pct):
            return tier, _dec(tier.bonus_amount)
    return None, ZERO


def compute(employee, period_start, period_end, per_day_rate=None):
    """Core engine. Returns a dict (not a model instance).

    per_day_rate — if None, derive from Employee.basic_salary / 30.
    """
    schedule = get_or_default_schedule(employee)
    ot_mult = _dec(schedule.ot_multiplier)
    hol_mult = _dec(schedule.holiday_multiplier)

    if per_day_rate is None:
        basic = _dec(employee.basic_salary or 0)
        per_day_rate = (basic / Decimal("30")).quantize(Decimal("0.01"))
    per_day_rate = _dec(per_day_rate)

    # Pre-fetch attendance / leave / holiday maps
    att_map = {a.date: a for a in Attendance.objects
               .filter(employee=employee, date__range=[period_start, period_end])}
    leave_map = {lv.leave_date: lv for lv in EmpLeave.objects
                 .filter(employee=employee, leave_date__range=[period_start, period_end],
                         status__iexact="approved")
                 .select_related("leave_type")}
    holiday_map = {h.hdate: h for h in Holiday.objects
                   .filter(active=True, hdate__range=[period_start, period_end])}

    # Accumulators
    scheduled_hours = ZERO
    worked_hours = ZERO
    ot_hours = ZERO
    holiday_hours = ZERO
    holiday_ot_hours = ZERO

    days_present = ZERO
    days_late = ZERO
    days_half = ZERO
    days_absent = ZERO
    days_leave = ZERO
    days_holiday_worked = ZERO

    regular_pay = ZERO
    ot_pay = ZERO
    holiday_pay = ZERO
    leave_pay = ZERO

    daily_lines = []

    for d in _days_in_range(period_start, period_end):
        weekday = d.weekday()
        scheduled = _dec(schedule.hours_for_weekday(weekday))
        att = att_map.get(d)
        lv = leave_map.get(d)
        hol = holiday_map.get(d)

        per_hour = (per_day_rate / scheduled) if scheduled > 0 else ZERO

        line = {
            "date": d.isoformat(),
            "weekday": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][weekday],
            "scheduled_hours": float(scheduled),
            "worked_hours": 0.0,
            "ot_hours": 0.0,
            "holiday": hol.holiday_name if hol else None,
            "status": "",
            "pay": 0.0,
            "note": "",
        }

        day_regular = ZERO
        day_ot = ZERO
        day_holiday_pay = ZERO
        day_leave_pay = ZERO

        # Don't count scheduled hours for off-days (scheduled=0) unless an OT day
        scheduled_hours += scheduled

        if att:
            s = (att.status or "").lower()
            hrs = _dec(att.worked_hours or 0)
            hrs_ot = _dec(att.ot_hours or 0)
            hrs_reg = max(ZERO, hrs - hrs_ot)

            worked_hours += hrs
            line["worked_hours"] = float(hrs)
            line["ot_hours"] = float(hrs_ot)
            line["status"] = att.status or ""

            if s == "half day":
                days_half += 1
                day_regular = (scheduled / 2) * per_hour if scheduled > 0 else per_day_rate / 2
                ot_hours += hrs_ot
                day_ot = hrs_ot * per_hour * ot_mult
                line["note"] = "Half Day"
            elif s == "late":
                days_late += 1
                # Late counts as present but flagged; pay reg hours worked
                day_regular = hrs_reg * per_hour
                ot_hours += hrs_ot
                day_ot = hrs_ot * per_hour * ot_mult
                line["note"] = "Late"
            elif s in ("present", "1"):
                days_present += 1
                day_regular = hrs_reg * per_hour if scheduled > 0 else per_day_rate
                ot_hours += hrs_ot
                day_ot = hrs_ot * per_hour * ot_mult
                line["note"] = "Present"
            else:
                # unknown status but has row — treat as absent
                days_absent += 1
                line["note"] = att.status or "Absent"

            if hol:
                # Worked on a holiday — apply holiday multiplier to regular + OT
                days_holiday_worked += 1
                holiday_hours += hrs_reg
                holiday_ot_hours += hrs_ot
                # Take what we calculated as regular+ot and upgrade to holiday rate
                base_reg_hrs = hrs_reg
                base_ot_hrs = hrs_ot
                day_holiday_pay = (base_reg_hrs * per_hour * hol_mult) + \
                                  (base_ot_hrs * per_hour * hol_mult)
                # Clear the non-holiday buckets we tentatively filled
                day_regular = ZERO
                day_ot = ZERO
                line["note"] = f"Worked on holiday ({hol.holiday_name})"

        elif lv:
            days_leave += 1
            pct = _dec(lv.leave_type.pay_percentage) if lv.leave_type else ZERO
            day_leave_pay = per_day_rate * pct / HUNDRED
            line["status"] = "On Leave"
            line["note"] = f"Leave: {lv.leave_type.att_type_name if lv.leave_type else '—'} ({pct}%)"

        elif hol:
            line["status"] = "Holiday"
            line["note"] = f"Holiday: {hol.holiday_name}"
            # No pay for not working on a holiday — matches existing policy

        else:
            if scheduled > 0:
                days_absent += 1
                line["status"] = "Absent"
                line["note"] = "Absent"
            else:
                line["status"] = "Off"
                line["note"] = "Off day"

        regular_pay += day_regular
        ot_pay += day_ot
        holiday_pay += day_holiday_pay
        leave_pay += day_leave_pay

        day_total = day_regular + day_ot + day_holiday_pay + day_leave_pay
        line["pay"] = float(day_total.quantize(Decimal("0.01")))
        daily_lines.append(line)

    # Attendance score: 100 − 10*absent − 5*late, clamped ≥ 0
    raw = HUNDRED - (days_absent * Decimal("10")) - (days_late * Decimal("5"))
    score = max(ZERO, min(HUNDRED, raw))

    per_hour_rate_overall = (per_day_rate / _dec(schedule.mon_hours or 8)).quantize(Decimal("0.01"))

    return {
        "period_start": period_start,
        "period_end": period_end,
        "per_day_rate": per_day_rate.quantize(Decimal("0.01")),
        "per_hour_rate": per_hour_rate_overall,
        "ot_multiplier": ot_mult,
        "holiday_multiplier": hol_mult,
        "scheduled_hours": scheduled_hours.quantize(Decimal("0.01")),
        "worked_hours": worked_hours.quantize(Decimal("0.01")),
        "ot_hours": ot_hours.quantize(Decimal("0.01")),
        "holiday_hours": holiday_hours.quantize(Decimal("0.01")),
        "holiday_ot_hours": holiday_ot_hours.quantize(Decimal("0.01")),
        "days_present": days_present,
        "days_late": days_late,
        "days_half": days_half,
        "days_absent": days_absent,
        "days_leave": days_leave,
        "days_holiday_worked": days_holiday_worked,
        "attendance_score": score.quantize(Decimal("0.01")),
        "regular_pay": regular_pay.quantize(Decimal("0.01")),
        "ot_pay": ot_pay.quantize(Decimal("0.01")),
        "holiday_pay": holiday_pay.quantize(Decimal("0.01")),
        "leave_pay": leave_pay.quantize(Decimal("0.01")),
        "daily_breakdown": daily_lines,
    }


def apply_allowance_catalog_line(allowance_type, basic_salary, override_amount=None):
    """Compute the final rupee amount for an allowance type.
    Validates against max_cap_amount. `override_amount` lets the voucher UI
    override the computed/default figure.
    """
    at = allowance_type
    if override_amount is not None:
        amt = _dec(override_amount)
    elif at.calc_mode == "PERCENT":
        amt = (_dec(basic_salary) * _dec(at.default_amount) / HUNDRED)
    else:
        amt = _dec(at.default_amount)

    cap = _dec(at.max_cap_amount)
    if cap > 0 and amt > cap:
        amt = cap
    return amt.quantize(Decimal("0.01"))


def compute_apit(gross_pay):
    """Apply the configured SL APIT (PAYE) slabs to a monthly gross.
    Returns (tax_amount, matched_slab_label). Returns (0, "") when no slabs.
    Formula per slab: tax = gross × rate_pct / 100 − deduct_amount.
    """
    gross = _dec(gross_pay)
    slabs = list(APITSlab.objects.filter(is_active=True).order_by("min_monthly"))
    if not slabs:
        return ZERO, ""
    for slab in slabs:
        lo = _dec(slab.min_monthly)
        hi = _dec(slab.max_monthly) if slab.max_monthly is not None else None
        if gross >= lo and (hi is None or gross <= hi):
            tax = gross * _dec(slab.rate_pct) / HUNDRED - _dec(slab.deduct_amount)
            return max(ZERO, tax.quantize(Decimal("0.01"))), slab.label or f"{slab.rate_pct}%"
    return ZERO, ""


def recompute_totals(payroll):
    """Roll up allowances + deductions + EPF + APIT onto a saved Payroll; save it."""
    allowances = list(payroll.allowances.all())
    deductions = list(payroll.deductions.all())
    alw_total = sum((_dec(a.amount) for a in allowances), ZERO)
    ded_total = sum((_dec(d.amount) for d in deductions), ZERO)

    payroll.allowance_total = alw_total
    payroll.deduction_total = ded_total

    payroll.gross_pay = (
        _dec(payroll.regular_pay) + _dec(payroll.ot_pay)
        + _dec(payroll.holiday_pay) + _dec(payroll.leave_pay)
        + alw_total
    )

    base = _dec(payroll.basic_for_epf)
    payroll.epf_employee_deduction = (base * _dec(payroll.epf_employee_pct) / HUNDRED).quantize(Decimal("0.01"))
    payroll.epf_company_contribution = (base * _dec(payroll.epf_company_pct) / HUNDRED).quantize(Decimal("0.01"))
    payroll.etf_company_contribution = (base * _dec(payroll.etf_company_pct) / HUNDRED).quantize(Decimal("0.01"))

    tax, tax_label = compute_apit(payroll.gross_pay)
    payroll.tax_amount = tax
    payroll.tax_slab_label = tax_label

    payroll.net_pay = (
        payroll.gross_pay - ded_total - payroll.epf_employee_deduction - tax
    ).quantize(Decimal("0.01"))
    payroll.save()
