from django.db import migrations


def fix_employee_data(apps, schema_editor):
    """
    After a database restore, Employee.fullname contains employee codes
    and User.first_name contains the correct full names.
    This migration swaps them into the correct fields.
    """
    Employee = apps.get_model('main', 'Employee')
    for emp in Employee.objects.select_related('user').all():
        old_fullname = emp.fullname           # currently holds the empcode
        real_fullname = emp.user.first_name   # correct full name from User table

        emp.empcode = old_fullname
        emp.fullname = real_fullname
        emp.save(update_fields=['empcode', 'fullname'])


def reverse_fix(apps, schema_editor):
    Employee = apps.get_model('main', 'Employee')
    for emp in Employee.objects.select_related('user').all():
        emp.fullname = emp.empcode
        emp.save(update_fields=['fullname'])


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0011_alter_attendance_options_and_more'),
    ]

    operations = [
        migrations.RunPython(fix_employee_data, reverse_fix),
    ]
