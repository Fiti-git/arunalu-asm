"""Backfill EmployeeFinancialProfile for every existing employee.

Derives initials + surname from `fullname` so EPF/ETF exports have usable
name parts immediately. Admins can refine values later from the UI.
"""
from django.db import migrations


def _derive(fullname):
    parts = [p for p in (fullname or "").split() if p]
    if not parts:
        return "", ""
    return " ".join(p[0] for p in parts[:-1]), parts[-1]


def backfill(apps, schema_editor):
    Employee = apps.get_model("main", "Employee")
    FinProfile = apps.get_model("payroll", "EmployeeFinancialProfile")

    existing = set(FinProfile.objects.values_list("employee_id", flat=True))
    to_create = []
    for e in Employee.objects.all().only("employee_id", "fullname"):
        if e.employee_id in existing:
            continue
        initials, surname = _derive(e.fullname)
        to_create.append(FinProfile(
            employee_id=e.employee_id,
            initials=initials,
            surname=surname,
            epf_member_status="E",
        ))
    if to_create:
        FinProfile.objects.bulk_create(to_create, batch_size=500)


def reverse_noop(apps, schema_editor):
    # Non-destructive: leave backfilled rows on rollback.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0004_company_config_and_fin_profile"),
    ]

    operations = [
        migrations.RunPython(backfill, reverse_noop),
    ]
