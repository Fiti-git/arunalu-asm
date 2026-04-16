from rest_framework import serializers
from .models import FingerprintUpload, FingerprintRow


class FingerprintUploadSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.username", read_only=True, default=None)
    committed_by_name = serializers.CharField(source="committed_by.username", read_only=True, default=None)

    class Meta:
        model = FingerprintUpload
        fields = [
            "id", "filename", "uploaded_at", "uploaded_by", "uploaded_by_name",
            "period_start", "period_end", "status",
            "total_rows", "matched_rows", "ambiguous_rows", "unmatched_rows", "conflict_rows",
            "committed_at", "committed_by", "committed_by_name", "notes",
        ]
        read_only_fields = fields


class FingerprintRowSerializer(serializers.ModelSerializer):
    matched_employee_name = serializers.CharField(
        source="matched_employee.fullname", read_only=True, default=None,
    )
    matched_empcode = serializers.CharField(
        source="matched_employee.empcode", read_only=True, default=None,
    )
    matched_primary_outlet_name = serializers.CharField(
        source="matched_employee.primary_outlet.name", read_only=True, default=None,
    )

    class Meta:
        model = FingerprintRow
        fields = [
            "id", "upload",
            "department", "raw_name", "parsed_empcode", "parsed_name",
            "date", "shift", "time_period", "check_in", "check_out",
            "matched_employee", "matched_employee_name", "matched_empcode",
            "matched_primary_outlet_name",
            "match_status", "has_asm_conflict", "skip_commit",
            "committed_attendance", "notes",
        ]
        read_only_fields = [
            "upload", "department", "raw_name", "parsed_empcode", "parsed_name",
            "date", "shift", "time_period",
            "committed_attendance", "has_asm_conflict",
            "matched_employee_name", "matched_empcode", "matched_primary_outlet_name",
        ]