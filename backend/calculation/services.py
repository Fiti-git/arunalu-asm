"""Helpers for splitting voucher cost across outlets."""
from decimal import Decimal

from .models import EmployeeOutletAllocation


def get_employee_allocations(employee):
    """Return list of (outlet_id, outlet_name, percentage) for an employee.

    Fallback order:
      1) Explicit EmployeeOutletAllocation rows.
      2) primary_outlet → 100%.
      3) Equal split across employee.outlets.
      4) Empty list if the employee has no outlets at all.
    """
    rows = list(
        EmployeeOutletAllocation.objects
        .filter(employee=employee)
        .select_related("outlet")
    )
    if rows:
        return [(r.outlet_id, r.outlet.name, Decimal(r.percentage)) for r in rows]

    if employee.primary_outlet_id:
        po = employee.primary_outlet
        return [(po.id, po.name, Decimal("100"))]

    outlets = list(employee.outlets.all())
    if not outlets:
        return []
    share = (Decimal("100") / Decimal(len(outlets))).quantize(Decimal("0.01"))
    return [(o.id, o.name, share) for o in outlets]


def split_voucher_by_outlet(voucher):
    """Return list of dicts: {outlet_id, outlet_name, percentage, amount}.

    Amount is voucher.net_pay * percentage / 100.
    """
    net = Decimal(voucher.net_pay or 0)
    allocations = get_employee_allocations(voucher.employee)
    out = []
    for oid, oname, pct in allocations:
        amount = (net * pct / Decimal("100")).quantize(Decimal("0.01"))
        out.append({
            "outlet_id": oid,
            "outlet_name": oname,
            "percentage": float(pct),
            "amount": float(amount),
        })
    return out
