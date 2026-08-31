from django.db import migrations


class Migration(migrations.Migration):
    """Functional index on LOWER(status) so the report CTEs stop doing a
    sequential scan on every dashboard hit.

    All report queries filter with `LOWER(a.status) IN (...)` which prevents
    the plain `status` index from being used. A postgres expression index
    keyed on LOWER(status) is picked up automatically without any code
    change on the report side.

    CONCURRENTLY keeps writes flowing while the index builds — safe against
    the live production DB.
    """

    atomic = False

    dependencies = [
        ('main', '0017_perf_indexes'),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                'CREATE INDEX CONCURRENTLY IF NOT EXISTS '
                'main_attendance_status_lower_idx '
                'ON public.main_attendance (LOWER(status));'
            ),
            reverse_sql=(
                'DROP INDEX CONCURRENTLY IF EXISTS main_attendance_status_lower_idx;'
            ),
        ),
    ]
