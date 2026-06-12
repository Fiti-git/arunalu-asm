from django.contrib.postgres.operations import AddIndexConcurrently
from django.db import migrations, models


class Migration(migrations.Migration):
    """Add composite indexes used by the heavy report CTEs.

    Uses AddIndexConcurrently so writes to Attendance / EmpLeave / EmployeeStatusLog
    are NOT blocked while the indexes build — safe to deploy against the live
    production database. The migration must be non-atomic for CONCURRENTLY to work.
    """

    atomic = False

    dependencies = [
        ('main', '0016_employeestatuslog_effective_date'),
    ]

    operations = [
        AddIndexConcurrently(
            model_name='attendance',
            index=models.Index(
                fields=['date', 'employee'],
                name='att_date_emp_idx',
            ),
        ),
        AddIndexConcurrently(
            model_name='empleave',
            index=models.Index(
                fields=['leave_date', 'employee'],
                name='empleave_date_emp_idx',
            ),
        ),
        AddIndexConcurrently(
            model_name='employeestatuslog',
            index=models.Index(
                fields=['action_at'],
                name='emp_status_log_action_at_idx',
            ),
        ),
    ]
