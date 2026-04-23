"""Payroll v2 — SL labour-law-aware monthly payroll."""
from django.db import models
from django.contrib.auth.models import User

from main.models import Employee


# ─── Config tables (admin CRUD) ─────────────────────────────────────────────

class AllowanceType(models.Model):
    """Catalog of allowance line items. A voucher picks from here.

    calc_mode:
      FIXED      — amount is the rupee value
      PERCENT    — amount is a % of basic_salary
    max_cap_amount is an absolute rupee cap regardless of mode (0 means no cap).
    """
    CALC_FIXED = "FIXED"
    CALC_PERCENT = "PERCENT"
    CALC_CHOICES = [(CALC_FIXED, "Fixed"), (CALC_PERCENT, "Percent of basic")]

    name = models.CharField(max_length=80, unique=True)
    calc_mode = models.CharField(max_length=10, choices=CALC_CHOICES, default=CALC_FIXED)
    default_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    max_cap_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0,
        help_text="0 = no cap")
    is_active = models.BooleanField(default=True)
    notes = models.CharField(max_length=255, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class AttendanceBonusTier(models.Model):
    """Global tiers for attendance-based bonus.

    Score = 100 - 10*absent - 5*late, clamped to [0, 100]. Highest tier
    whose range covers the score wins; bonus added as a PayrollAllowance line.
    """
    min_pct = models.DecimalField(max_digits=5, decimal_places=2)
    max_pct = models.DecimalField(max_digits=5, decimal_places=2)
    bonus_amount = models.DecimalField(max_digits=12, decimal_places=2)
    label = models.CharField(max_length=80, default="Attendance Bonus")
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-min_pct"]

    def __str__(self):
        return f"{self.min_pct}–{self.max_pct}% → {self.bonus_amount}"


class WorkSchedule(models.Model):
    """Per-employee weekly working-hours template (Mon–Sun). 0 = off-day."""
    employee = models.OneToOneField(
        Employee, on_delete=models.CASCADE, related_name="work_schedule"
    )
    mon_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8)
    tue_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8)
    wed_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8)
    thu_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8)
    fri_hours = models.DecimalField(max_digits=4, decimal_places=2, default=8)
    sat_hours = models.DecimalField(max_digits=4, decimal_places=2, default=6)
    sun_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    ot_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.5)
    holiday_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=2.0)
    updated_at = models.DateTimeField(auto_now=True)

    def hours_for_weekday(self, weekday):
        """weekday: 0=Mon … 6=Sun (matches datetime.weekday())."""
        return [
            self.mon_hours, self.tue_hours, self.wed_hours, self.thu_hours,
            self.fri_hours, self.sat_hours, self.sun_hours,
        ][weekday]

    def __str__(self):
        return f"Schedule({self.employee_id})"


# ─── Payroll voucher ────────────────────────────────────────────────────────

class Payroll(models.Model):
    """Monthly payroll snapshot for one employee."""
    STATUS_DRAFT = "Draft"
    STATUS_LOCKED = "Locked"
    STATUS_CHOICES = [(STATUS_DRAFT, "Draft"), (STATUS_LOCKED, "Locked")]

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="payrolls"
    )
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_DRAFT)

    # Rate snapshot
    per_day_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    per_hour_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ot_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.5)
    holiday_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=2.0)

    # Attendance snapshot
    scheduled_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    worked_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    ot_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    holiday_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    holiday_ot_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    days_present = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    days_late = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    days_half = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    days_absent = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    days_leave = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    days_holiday_worked = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    attendance_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Pay breakdown (snapshot)
    regular_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ot_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    holiday_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    leave_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    allowance_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deduction_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # EPF / ETF snapshot
    basic_for_epf = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    epf_employee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=8)
    epf_company_pct = models.DecimalField(max_digits=5, decimal_places=2, default=12)
    etf_company_pct = models.DecimalField(max_digits=5, decimal_places=2, default=3)
    epf_employee_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    epf_company_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    etf_company_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # APIT / PAYE snapshot
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_slab_label = models.CharField(max_length=80, blank=True, default="")

    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Daily breakdown cached as JSON (list of dicts) for quick UI display
    daily_breakdown = models.JSONField(default=list, blank=True)

    notes = models.TextField(blank=True, default="")
    generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payrolls_generated",
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    locked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payrolls_locked",
    )
    locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-period_end", "-generated_at"]
        unique_together = [("employee", "period_start", "period_end")]

    def __str__(self):
        return f"Payroll #{self.pk} {self.employee_id} {self.period_start}..{self.period_end}"


class PayrollAllowance(models.Model):
    payroll = models.ForeignKey(
        Payroll, on_delete=models.CASCADE, related_name="allowances"
    )
    allowance_type = models.ForeignKey(
        AllowanceType, on_delete=models.PROTECT, null=True, blank=True,
    )
    label = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.label}: {self.amount}"


class PayrollDeduction(models.Model):
    payroll = models.ForeignKey(
        Payroll, on_delete=models.CASCADE, related_name="deductions"
    )
    label = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.label}: {self.amount}"


class APITSlab(models.Model):
    """Sri Lankan APIT (PAYE) monthly slab.

    Progressive tax: tax = gross × rate_pct / 100 − deduct_amount.
    min_monthly/max_monthly define the income bracket this slab applies to.
    max_monthly can be null for the top-most unbounded slab.
    """
    label = models.CharField(max_length=80, blank=True, default="")
    min_monthly = models.DecimalField(max_digits=12, decimal_places=2)
    max_monthly = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    rate_pct = models.DecimalField(max_digits=5, decimal_places=2)
    deduct_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["min_monthly"]

    def __str__(self):
        hi = self.max_monthly if self.max_monthly is not None else "∞"
        return f"{self.min_monthly}–{hi} @ {self.rate_pct}%"
