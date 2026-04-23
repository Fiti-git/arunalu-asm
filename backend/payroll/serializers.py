from rest_framework import serializers

from .models import (
    AllowanceType, AttendanceBonusTier, WorkSchedule,
    Payroll, PayrollAllowance, PayrollDeduction, APITSlab,
)


class APITSlabSerializer(serializers.ModelSerializer):
    class Meta:
        model = APITSlab
        fields = ["id", "label", "min_monthly", "max_monthly",
                  "rate_pct", "deduct_amount", "is_active", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate(self, data):
        lo = data.get("min_monthly", getattr(self.instance, "min_monthly", None))
        hi = data.get("max_monthly", getattr(self.instance, "max_monthly", None))
        if lo is not None and hi is not None and float(hi) < float(lo):
            raise serializers.ValidationError({"max_monthly": "max must be ≥ min."})
        return data


class AllowanceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AllowanceType
        fields = [
            "id", "name", "calc_mode", "default_amount", "max_cap_amount",
            "is_active", "notes", "updated_at",
        ]
        read_only_fields = ["updated_at"]

    def validate(self, data):
        cap = data.get("max_cap_amount", getattr(self.instance, "max_cap_amount", 0) or 0)
        default_amt = data.get("default_amount", getattr(self.instance, "default_amount", 0) or 0)
        calc_mode = data.get("calc_mode", getattr(self.instance, "calc_mode", "FIXED"))
        if calc_mode == "FIXED" and cap and default_amt and float(default_amt) > float(cap):
            raise serializers.ValidationError(
                {"default_amount": "Default cannot exceed max cap."}
            )
        return data


class AttendanceBonusTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceBonusTier
        fields = ["id", "min_pct", "max_pct", "bonus_amount", "label", "is_active", "updated_at"]
        read_only_fields = ["updated_at"]

    def validate(self, data):
        lo = data.get("min_pct", getattr(self.instance, "min_pct", None))
        hi = data.get("max_pct", getattr(self.instance, "max_pct", None))
        if lo is not None and hi is not None and float(lo) > float(hi):
            raise serializers.ValidationError(
                {"min_pct": "min_pct must be ≤ max_pct."}
            )
        return data


class WorkScheduleSerializer(serializers.ModelSerializer):
    fullname = serializers.CharField(source="employee.fullname", read_only=True)
    empcode = serializers.CharField(source="employee.empcode", read_only=True)

    class Meta:
        model = WorkSchedule
        fields = [
            "id", "employee", "fullname", "empcode",
            "mon_hours", "tue_hours", "wed_hours", "thu_hours",
            "fri_hours", "sat_hours", "sun_hours",
            "ot_multiplier", "holiday_multiplier", "updated_at",
        ]
        read_only_fields = ["employee", "fullname", "empcode", "updated_at"]


class PayrollAllowanceSerializer(serializers.ModelSerializer):
    allowance_type_name = serializers.CharField(source="allowance_type.name", read_only=True, default=None)

    class Meta:
        model = PayrollAllowance
        fields = ["id", "allowance_type", "allowance_type_name", "label", "amount"]


class PayrollDeductionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollDeduction
        fields = ["id", "label", "amount"]


class PayrollSerializer(serializers.ModelSerializer):
    allowances = PayrollAllowanceSerializer(many=True, read_only=True)
    deductions = PayrollDeductionSerializer(many=True, read_only=True)
    employee_fullname = serializers.CharField(source="employee.fullname", read_only=True)
    empcode = serializers.CharField(source="employee.empcode", read_only=True)
    primary_outlet_name = serializers.CharField(
        source="employee.primary_outlet.name", read_only=True, default=None,
    )
    generated_by_name = serializers.CharField(source="generated_by.username", read_only=True, default=None)
    locked_by_name = serializers.CharField(source="locked_by.username", read_only=True, default=None)

    class Meta:
        model = Payroll
        fields = [
            "id", "employee", "employee_fullname", "empcode", "primary_outlet_name",
            "period_start", "period_end", "status",
            "per_day_rate", "per_hour_rate", "ot_multiplier", "holiday_multiplier",
            "scheduled_hours", "worked_hours", "ot_hours",
            "holiday_hours", "holiday_ot_hours",
            "days_present", "days_late", "days_half", "days_absent",
            "days_leave", "days_holiday_worked", "attendance_score",
            "regular_pay", "ot_pay", "holiday_pay", "leave_pay",
            "allowance_total", "deduction_total", "gross_pay",
            "basic_for_epf", "epf_employee_pct", "epf_company_pct", "etf_company_pct",
            "epf_employee_deduction", "epf_company_contribution", "etf_company_contribution",
            "tax_amount", "tax_slab_label",
            "net_pay", "daily_breakdown", "notes",
            "generated_by", "generated_by_name", "generated_at", "updated_at",
            "locked_by", "locked_by_name", "locked_at",
            "allowances", "deductions",
        ]
        read_only_fields = [
            "generated_by", "generated_at", "updated_at",
            "locked_by", "locked_at", "employee_fullname", "empcode",
            "primary_outlet_name", "generated_by_name", "locked_by_name",
            "allowances", "deductions",
        ]
