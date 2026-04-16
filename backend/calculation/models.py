from django.db import models
from django.contrib.auth.models import User

from main.models import Employee


class EmployeeSalary(models.Model):
    """Per-employee payroll rate (used to compute voucher pay)."""
    employee = models.OneToOneField(
        Employee, on_delete=models.CASCADE, related_name="salary_profile"
    )
    per_day_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    per_hour_ot_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_hours_per_day = models.DecimalField(max_digits=5, decimal_places=2, default=8)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"SalaryProfile({self.employee_id}) {self.per_day_salary}/day"


class PaymentVoucher(models.Model):
    STATUS_CHOICES = [("Draft", "Draft"), ("Locked", "Locked")]

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="payment_vouchers"
    )
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="Draft")

    # Snapshot — rates used for this voucher
    per_day_rate_used = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    per_hour_ot_rate_used = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_hours_per_day = models.DecimalField(max_digits=5, decimal_places=2, default=8)

    # Snapshot — attendance counts
    days_present = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    days_late = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    days_half = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    days_leave = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    days_absent = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    holiday_work_days = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    ot_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    # Snapshot — pay breakdown
    regular_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ot_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    holiday_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    leave_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    allowance_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deduction_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Snapshot — EPF / ETF
    basic_for_epf = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    epf_employee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=8)
    epf_company_pct = models.DecimalField(max_digits=5, decimal_places=2, default=12)
    etf_company_pct = models.DecimalField(max_digits=5, decimal_places=2, default=3)
    epf_employee_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    epf_company_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    etf_company_contribution = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    notes = models.TextField(blank=True, default="")

    generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="vouchers_generated",
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    locked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="vouchers_locked",
    )
    locked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-period_end", "-generated_at"]
        unique_together = [("employee", "period_start", "period_end")]

    def __str__(self):
        return f"Voucher #{self.pk} {self.employee_id} {self.period_start}..{self.period_end} ({self.status})"


class VoucherAllowance(models.Model):
    voucher = models.ForeignKey(
        PaymentVoucher, on_delete=models.CASCADE, related_name="allowances"
    )
    label = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.label}: {self.amount}"


class VoucherDeduction(models.Model):
    voucher = models.ForeignKey(
        PaymentVoucher, on_delete=models.CASCADE, related_name="deductions"
    )
    label = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.label}: {self.amount}"