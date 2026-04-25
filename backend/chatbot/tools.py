"""
Tool functions exposed to the LLM. Each function:
  - takes plain JSON-serializable args
  - takes the requesting user (for outlet scoping)
  - returns a small JSON-serializable dict the LLM can summarise

Keep results small. The LLM does not need raw rows — it needs counts +
short lists with key fields. Big payloads waste tokens and slow answers.
"""
from datetime import date, datetime, timedelta
from typing import Optional

from django.contrib.auth.models import User
from django.db.models import Q

from main.models import Attendance, EmpLeave, Employee, Outlet


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _parse_date(value: Optional[str]) -> date:
    """Accept 'today', 'yesterday', or 'YYYY-MM-DD'. Default = today."""
    if not value or value.lower() == "today":
        return date.today()
    if value.lower() == "yesterday":
        return date.today() - timedelta(days=1)
    return datetime.strptime(value, "%Y-%m-%d").date()


def _resolve_outlet(name: Optional[str], user: User) -> Optional[Outlet]:
    """
    Fuzzy-resolve outlet by name. Manager users are restricted to outlets
    they manage; admin sees all.
    """
    qs = Outlet.objects.filter(status=1)
    is_admin = user.is_superuser or user.groups.filter(name__iexact="Admin").exists()
    if not is_admin:
        try:
            emp = Employee.objects.get(user=user)
            qs = qs.filter(Q(manager=emp) | Q(employees=emp)).distinct()
        except Employee.DoesNotExist:
            return None
    if not name:
        return qs.first()
    return qs.filter(name__icontains=name).first()


def _outlet_scope(user: User):
    """Outlet IDs this user is allowed to see."""
    if user.is_superuser or user.groups.filter(name__iexact="Admin").exists():
        return None  # None = all outlets
    try:
        emp = Employee.objects.get(user=user)
    except Employee.DoesNotExist:
        return []
    ids = set(emp.outlets.values_list("id", flat=True))
    ids.update(Outlet.objects.filter(manager=emp).values_list("id", flat=True))
    return list(ids)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------
def get_absent_today(user: User, outlet_name: Optional[str] = None,
                     date_str: Optional[str] = None) -> dict:
    """List employees who are absent (no attendance + no approved leave) on a given day."""
    target = _parse_date(date_str)
    outlet = _resolve_outlet(outlet_name, user) if outlet_name else None
    scope = _outlet_scope(user)

    employees = Employee.objects.filter(is_active=True)
    if outlet:
        employees = employees.filter(outlets=outlet)
    elif scope is not None:
        employees = employees.filter(outlets__id__in=scope).distinct()

    present_ids = set(
        Attendance.objects.filter(date=target, employee__in=employees)
        .values_list("employee_id", flat=True)
    )
    onleave_ids = set(
        EmpLeave.objects.filter(leave_date=target, status="approved",
                                employee__in=employees)
        .values_list("employee_id", flat=True)
    )
    excluded = present_ids | onleave_ids
    absent = employees.exclude(employee_id__in=excluded)[:50]

    return {
        "date": target.isoformat(),
        "outlet": outlet.name if outlet else "all accessible outlets",
        "absent_count": absent.count(),
        "absent": [
            {"id": e.employee_id, "name": e.fullname, "code": e.empcode}
            for e in absent
        ],
    }


def get_pending_leaves(user: User, outlet_name: Optional[str] = None) -> dict:
    """List pending leave requests, optionally filtered by outlet."""
    outlet = _resolve_outlet(outlet_name, user) if outlet_name else None
    scope = _outlet_scope(user)

    qs = EmpLeave.objects.filter(status="pending").select_related("employee", "leave_type")
    if outlet:
        qs = qs.filter(employee__outlets=outlet)
    elif scope is not None:
        qs = qs.filter(employee__outlets__id__in=scope).distinct()

    qs = qs.order_by("-leave_date")[:30]
    return {
        "outlet": outlet.name if outlet else "all accessible outlets",
        "count": qs.count(),
        "pending": [
            {
                "leave_id": l.leave_refno,
                "employee": l.employee.fullname,
                "date": l.leave_date.isoformat(),
                "type": l.leave_type.att_type_name if l.leave_type else "Unknown",
                "remarks": (l.remarks or "")[:120],
            }
            for l in qs
        ],
    }


def get_employee_status(user: User, employee_name: str,
                        date_str: Optional[str] = None) -> dict:
    """Punch-in/out and leave status for a specific employee on a given day."""
    target = _parse_date(date_str)
    scope = _outlet_scope(user)
    qs = Employee.objects.filter(is_active=True, fullname__icontains=employee_name)
    if scope is not None:
        qs = qs.filter(outlets__id__in=scope).distinct()

    emp = qs.first()
    if not emp:
        return {"error": f"No employee matching '{employee_name}' in your scope."}

    att = Attendance.objects.filter(employee=emp, date=target).first()
    leave = EmpLeave.objects.filter(employee=emp, leave_date=target).first()

    return {
        "employee": {"id": emp.employee_id, "name": emp.fullname, "code": emp.empcode},
        "date": target.isoformat(),
        "attendance": {
            "status": att.status if att else None,
            "check_in": att.check_in_time.isoformat() if att and att.check_in_time else None,
            "check_out": att.check_out_time.isoformat() if att and att.check_out_time else None,
            "worked_hours": att.worked_hours if att else None,
            "verification": att.punchin_verification if att else None,
        } if att else None,
        "leave": {
            "type": leave.leave_type.att_type_name if leave and leave.leave_type else None,
            "status": leave.status if leave else None,
        } if leave else None,
    }


def get_outlet_summary(user: User, outlet_name: Optional[str] = None,
                       date_str: Optional[str] = None) -> dict:
    """Headline KPIs for an outlet on a given day: present / absent / late / on-leave."""
    target = _parse_date(date_str)
    outlet = _resolve_outlet(outlet_name, user)
    if not outlet:
        return {"error": "No matching outlet in your scope."}

    employees = Employee.objects.filter(is_active=True, outlets=outlet)
    total = employees.count()
    att = Attendance.objects.filter(date=target, employee__in=employees)
    present = att.filter(status="Present").count()
    late = att.filter(status="Late").count()
    half = att.filter(status="Half Day").count()
    on_leave = EmpLeave.objects.filter(
        leave_date=target, status="approved", employee__in=employees
    ).count()
    absent = total - (present + late + half + on_leave)

    return {
        "outlet": outlet.name,
        "date": target.isoformat(),
        "total_active_employees": total,
        "present": present,
        "late": late,
        "half_day": half,
        "on_leave": on_leave,
        "absent": max(absent, 0),
    }


# ---------------------------------------------------------------------------
# Registry — name → (callable, JSON schema for the LLM)
# ---------------------------------------------------------------------------
TOOL_REGISTRY = {
    "get_absent_today": {
        "fn": get_absent_today,
        "schema": {
            "type": "function",
            "function": {
                "name": "get_absent_today",
                "description": "List employees who did not punch in and are not on approved leave for a given date.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "outlet_name": {"type": "string", "description": "Optional outlet name (fuzzy match)."},
                        "date_str": {"type": "string", "description": "'today', 'yesterday', or YYYY-MM-DD. Default today."},
                    },
                },
            },
        },
    },
    "get_pending_leaves": {
        "fn": get_pending_leaves,
        "schema": {
            "type": "function",
            "function": {
                "name": "get_pending_leaves",
                "description": "List leave requests waiting for approval.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "outlet_name": {"type": "string", "description": "Optional outlet name to filter by."},
                    },
                },
            },
        },
    },
    "get_employee_status": {
        "fn": get_employee_status,
        "schema": {
            "type": "function",
            "function": {
                "name": "get_employee_status",
                "description": "Get punch-in/out and leave status for one employee on a given day.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "employee_name": {"type": "string", "description": "Full or partial employee name."},
                        "date_str": {"type": "string", "description": "'today', 'yesterday', or YYYY-MM-DD. Default today."},
                    },
                    "required": ["employee_name"],
                },
            },
        },
    },
    "get_outlet_summary": {
        "fn": get_outlet_summary,
        "schema": {
            "type": "function",
            "function": {
                "name": "get_outlet_summary",
                "description": "Get attendance KPIs (present/absent/late/on-leave counts) for an outlet on a date.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "outlet_name": {"type": "string", "description": "Outlet name (fuzzy match)."},
                        "date_str": {"type": "string", "description": "'today', 'yesterday', or YYYY-MM-DD."},
                    },
                },
            },
        },
    },
}


def all_schemas():
    return [t["schema"] for t in TOOL_REGISTRY.values()]


def run_tool(name: str, args: dict, user: User) -> dict:
    entry = TOOL_REGISTRY.get(name)
    if not entry:
        return {"error": f"Unknown tool: {name}"}
    try:
        return entry["fn"](user=user, **(args or {}))
    except TypeError as e:
        return {"error": f"Bad arguments for {name}: {e}"}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}
