"""Utilities for filtering attendance / leave records by employee active periods.

An employee can be deactivated and reactivated multiple times. Each (de)activation
event is recorded in ``EmployeeStatusLog``. For reports, we want to exclude records
that fall within periods when the employee was deactivated. For example, if an
employee was deactivated on 2024-06-01 and reactivated on 2024-09-01, a report
covering 2024-05-01 to 2024-12-31 should include records up through 2024-05-31
and from 2024-09-01 onward, but not the gap in between.

Active periods are computed from EmployeeStatusLog. If no logs exist:
  - currently active employee → considered active for all time
  - currently inactive employee → considered inactive from ``inactive_date`` onward
"""
from datetime import date
from django.db.models import Q

from .models import Employee, EmployeeStatusLog


# Sentinel "from beginning of time" — Django DateField allows this.
EPOCH = date(1900, 1, 1)


def get_employee_active_periods(employee):
    """Return list of (start_date, end_date_or_None) tuples representing active windows.

    ``end_date`` is ``None`` for an open-ended (currently active) trailing window.
    ``start_date`` of the first window is the EPOCH sentinel (records prior to any
    log are assumed to be from the initial active period).
    """
    logs = list(
        EmployeeStatusLog.objects
        .filter(employee=employee)
    )

    def _log_date(log):
        return log.effective_date or (
            log.action_at.date() if hasattr(log.action_at, 'date') else log.action_at
        )

    logs.sort(key=lambda l: (_log_date(l), l.action_at))

    if not logs:
        if employee.is_active:
            return [(EPOCH, None)]
        end = employee.inactive_date or EPOCH
        return [(EPOCH, end)]

    intervals = []
    current_start = EPOCH  # employee assumed active from the beginning
    for log in logs:
        log_date = _log_date(log)
        if log.action == 'DEACTIVATED' and current_start is not None:
            intervals.append((current_start, log_date))
            current_start = None
        elif log.action == 'ACTIVATED' and current_start is None:
            current_start = log_date

    if current_start is not None:
        intervals.append((current_start, None))

    return intervals


def filter_qs_by_active_periods(qs, employee_field='employee', date_field='date'):
    """Filter a queryset to only include records within each employee's active periods.

    ``employee_field``: FK lookup to Employee on the model (e.g. ``'employee'``).
    ``date_field``: DateField/DateTimeField on the model (e.g. ``'date'``).

    Implementation notes:
      * Builds a single ``Q()`` expression OR-combining each employee's active
        intervals. Cost scales with the number of distinct employees in ``qs``.
      * If ``qs`` is empty, returns it unchanged.
    """
    employee_id_field = f'{employee_field}_id'
    employee_ids = list(qs.values_list(employee_id_field, flat=True).distinct())
    if not employee_ids:
        return qs

    employees = Employee.objects.filter(employee_id__in=employee_ids)
    combined = Q(pk__in=[])  # always-false starting point

    for emp in employees:
        for start, end in get_employee_active_periods(emp):
            cond = Q(**{employee_id_field: emp.employee_id, f'{date_field}__gte': start})
            if end is not None:
                cond &= Q(**{f'{date_field}__lte': end})
            combined |= cond

    return qs.filter(combined)


def is_active_on(employee, on_date):
    """Return True if ``employee`` was active on ``on_date``."""
    for start, end in get_employee_active_periods(employee):
        if start <= on_date and (end is None or on_date <= end):
            return True
    return False
