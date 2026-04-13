from rest_framework import serializers
from main.models import EmpLeave


class MobileEmpLeaveSerializer(serializers.ModelSerializer):
    leave_type_id = serializers.IntegerField(source='leave_type.id', read_only=True)
    leave_type_name = serializers.CharField(source='leave_type.att_type_name', read_only=True)
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)

    class Meta:
        model = EmpLeave
        fields = [
            'leave_refno',
            'leave_date',
            'remarks',
            'add_date',
            'action_date',
            'status',
            'employee',
            'employee_name',
            'leave_type_id',
            'leave_type_name',
            'action_user',
        ]
