from rest_framework import serializers
from main.models import Attendance


class MobileAttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.fullname', read_only=True)
    punchin_selfie_url = serializers.ImageField(source='employee.punchin_selfie', read_only=True)
    punchout_selfie_url = serializers.ImageField(source='employee.punchout_selfie', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'attendance_id',
            'employee',
            'employee_name',
            'date',
            'check_in_time',
            'check_in_lat',
            'check_in_long',
            'check_out_time',
            'check_out_lat',
            'check_out_long',
            'worked_hours',
            'ot_hours',
            'status',
            'punchin_verification',
            'punchout_verification',
            'verification_notes',
            'created_at',
            'updated_at',
            'punchin_selfie_url',
            'punchout_selfie_url',
        ]
        read_only_fields = [
            'attendance_id', 'worked_hours', 'ot_hours', 'status',
            'punchin_verification', 'punchout_verification',
            'created_at', 'updated_at',
        ]
