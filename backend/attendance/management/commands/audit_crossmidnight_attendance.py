"""Report attendance records whose punch-out lands on a different calendar day
than the record's `date` — usually a forgotten punch-out that got closed on
a later day, producing worked_hours in the 24+ range.

Read-only by default. Pass --fix to null the check_out_time on records where
the checkout is more than N hours after check-in, so a manager can re-enter
the correct value through the Attendance Modification UI.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import F
from django.utils import timezone

from main.models import Attendance


class Command(BaseCommand):
    help = "Report (and optionally reset) attendance records whose punch-out crosses days."

    def add_arguments(self, parser):
        parser.add_argument(
            '--min-hours',
            type=float,
            default=20.0,
            help='Only report records with worked_hours >= this value (default 20).',
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Null out check_out_time on flagged records so managers can re-enter it.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=200,
            help='Cap the number of rows processed (default 200).',
        )

    def handle(self, *args, **opts):
        min_hours = opts['min_hours']
        do_fix = opts['fix']
        limit = opts['limit']

        # Cross-midnight records: date on the row differs from the date
        # portion of check_out_time, AND worked_hours is over the threshold.
        qs = (
            Attendance.objects
            .filter(check_out_time__isnull=False, worked_hours__gte=min_hours)
            .select_related('employee')
            .order_by('-worked_hours')[:limit]
        )

        flagged = []
        for a in qs:
            checkout_date = timezone.localtime(a.check_out_time).date()
            if checkout_date != a.date:
                flagged.append(a)

        self.stdout.write(self.style.WARNING(
            f"Found {len(flagged)} record(s) with worked_hours ≥ {min_hours} "
            f"and checkout on a different day than the record date."
        ))
        for a in flagged:
            checkout_local = timezone.localtime(a.check_out_time) if a.check_out_time else None
            self.stdout.write(
                f"  attendance_id={a.attendance_id} "
                f"emp={a.employee.employee_id} ({a.employee.fullname}) "
                f"date={a.date} checkout={checkout_local} worked={a.worked_hours}h"
            )

        if do_fix and flagged:
            self.stdout.write(self.style.WARNING("Resetting check_out_time on flagged rows..."))
            for a in flagged:
                a.check_out_time = None
                a.worked_hours = None
                a.ot_hours = None
                a.punchout_verification = 'Pending'
                a.save(update_fields=[
                    'check_out_time', 'worked_hours', 'ot_hours', 'punchout_verification',
                ])
            self.stdout.write(self.style.SUCCESS(f"Reset {len(flagged)} row(s)."))
        elif flagged:
            self.stdout.write(
                "Dry run only. Re-run with --fix to null the checkout on these rows."
            )
