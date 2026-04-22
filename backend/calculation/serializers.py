from rest_framework import serializers

from .models import (
    EmployeeSalary, PaymentVoucher, VoucherAllowance, VoucherDeduction,
    EmployeeOutletAllocation,
)


class EmployeeOutletAllocationSerializer(serializers.ModelSerializer):
    outlet_name = serializers.CharField(source="outlet.name", read_only=True)

    class Meta:
        model = EmployeeOutletAllocation
        fields = ["id", "employee", "outlet", "outlet_name", "percentage", "updated_at"]
        read_only_fields = ["updated_at", "outlet_name"]


class EmployeeSalarySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeSalary
        fields = [
            "employee", "per_day_salary", "per_hour_ot_rate",
            "expected_hours_per_day", "updated_at",
        ]
        read_only_fields = ["employee", "updated_at"]


class VoucherAllowanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoucherAllowance
        fields = ["id", "label", "amount"]


class VoucherDeductionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoucherDeduction
        fields = ["id", "label", "amount"]


class PaymentVoucherSerializer(serializers.ModelSerializer):
    allowances = VoucherAllowanceSerializer(many=True, required=False)
    deductions = VoucherDeductionSerializer(many=True, required=False)
    employee_fullname = serializers.CharField(source="employee.fullname", read_only=True)
    empcode = serializers.CharField(source="employee.empcode", read_only=True)
    primary_outlet_name = serializers.CharField(
        source="employee.primary_outlet.name", read_only=True, default=None
    )
    generated_by_name = serializers.CharField(source="generated_by.username", read_only=True, default=None)
    locked_by_name = serializers.CharField(source="locked_by.username", read_only=True, default=None)

    class Meta:
        model = PaymentVoucher
        fields = [
            "id", "employee", "employee_fullname", "empcode", "primary_outlet_name",
            "period_start", "period_end", "status",
            "per_day_rate_used", "per_hour_ot_rate_used", "expected_hours_per_day",
            "days_present", "days_late", "days_half", "days_leave", "days_absent",
            "holiday_work_days", "ot_hours",
            "regular_pay", "ot_pay", "holiday_pay", "leave_pay",
            "allowance_total", "deduction_total", "gross_pay",
            "basic_for_epf", "epf_employee_pct", "epf_company_pct", "etf_company_pct",
            "epf_employee_deduction", "epf_company_contribution", "etf_company_contribution",
            "net_pay", "notes",
            "generated_by", "generated_by_name", "generated_at", "updated_at",
            "locked_by", "locked_by_name", "locked_at",
            "allowances", "deductions",
        ]
        read_only_fields = [
            "generated_by", "generated_at", "updated_at",
            "locked_by", "locked_at", "employee_fullname", "empcode",
            "primary_outlet_name", "generated_by_name", "locked_by_name",
        ]