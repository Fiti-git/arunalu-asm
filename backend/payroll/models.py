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


class PayrollCompanyConfig(models.Model):
    """Singleton — company-level constants needed for EPF/ETF/Bank exports."""
    company_name = models.CharField(max_length=200, blank=True, default="")

    # EPF / ETF employer identity
    employer_epf_number = models.CharField(max_length=20, blank=True, default="")
    employer_etf_number = models.CharField(max_length=20, blank=True, default="")
    epf_zone_code = models.CharField(max_length=5, blank=True, default="A")
    # Increments each time EPF export is generated (field 13 in EPF file)
    data_submission_number = models.PositiveIntegerField(default=1)

    # Company disbursement bank account
    company_bank_name = models.CharField(max_length=100, blank=True, default="")
    company_bank_code = models.CharField(max_length=10, blank=True, default="")
    company_bank_branch_code = models.CharField(max_length=10, blank=True, default="")
    company_bank_account_no = models.CharField(max_length=30, blank=True, default="")

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payroll Company Config"
        verbose_name_plural = "Payroll Company Config"

    def __str__(self):
        return self.company_name or "Payroll Company Config"

    @classmethod
    def get_solo(cls):
        obj = cls.objects.first()
        if obj is None:
            obj = cls.objects.create()
        return obj


class EmployeeFinancialProfile(models.Model):
    """Per-employee payroll/compliance data that isn't on the core Employee row."""
    MEMBER_STATUS_EXISTING = "E"
    MEMBER_STATUS_NEW = "N"
    MEMBER_STATUS_CHOICES = [
        (MEMBER_STATUS_EXISTING, "Existing"),
        (MEMBER_STATUS_NEW, "New"),
    ]

    employee = models.OneToOneField(
        Employee, on_delete=models.CASCADE, related_name="financial_profile",
    )

    # Name parts — EPF/ETF need these split. Default: derived from fullname on save.
    surname = models.CharField(max_length=100, blank=True, default="")
    initials = models.CharField(max_length=30, blank=True, default="")

    # EPF
    epf_member_status = models.CharField(
        max_length=1, choices=MEMBER_STATUS_CHOICES,
        default=MEMBER_STATUS_EXISTING,
    )
    # ETF — usually same as EPF member number; explicit field lets it differ
    etf_member_no = models.CharField(max_length=20, blank=True, default="")

    # Bank (for salary disbursement)
    bank_name = models.CharField(max_length=100, blank=True, default="")
    bank_code = models.CharField(max_length=10, blank=True, default="")
    bank_branch_code = models.CharField(max_length=10, blank=True, default="")
    bank_account_no = models.CharField(max_length=30, blank=True, default="")

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"FinProfile({self.employee_id})"


class PayrollAuditLog(models.Model):
    """Append-only trail of payroll mutations: create/edit/lock/unlock/delete."""
    ACTION_CHOICES = [
        ("create", "Create"),
        ("edit", "Edit"),
        ("lock", "Lock"),
        ("unlock", "Unlock"),
        ("delete", "Delete"),
    ]

    payroll = models.ForeignKey(
        Payroll, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="audit_logs",
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="payroll_audit_actions",
    )
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        uid = self.user_id or "?"
        pid = self.payroll_id or "deleted"
        return f"audit[{self.action}] payroll={pid} user={uid} at {self.created_at}"
