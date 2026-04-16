# reports/views_optimized.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.db.models import Q
from datetime import datetime, date, timedelta
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_date
from django.contrib.auth.models import User
from main.models import EmpLeave, Employee, LeaveType, Outlet
from .serializers import EmpLeaveSerializer, LeaveCreateSerializer
from aas.pagination import StandardPagination

from django.utils.timezone import now



MAX_RANGE_DAYS = 366  # protect against huge ranges


def parse_dates_or_default(start_date_str, end_date_str):
    today = date.today()
    if start_date_str and end_date_str:
        try:
            sd = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            ed = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD.")
    else:
        sd = date(today.year, today.month, 1)
        if today.month == 12:
            ed = date(today.year, 12, 31)
        else:
            ed = date(today.year, today.month + 1, 1) - timedelta(days=1)
    if (ed - sd).days > MAX_RANGE_DAYS:
        raise ValueError(f"Date range too large. Max {MAX_RANGE_DAYS} days allowed.")
    return sd, ed


def run_sql(query, params=None):
    with connection.cursor() as cursor:
        cursor.execute(query, params or [])
        cols = [c[0] for c in cursor.description] if cursor.description else []
        rows = [dict(zip(cols, r)) for r in cursor.fetchall()] if cols else []
    return rows


# ------------------------------
# 1) DashboardOverviewAPIView
# ------------------------------
class DashboardOverviewAPIView(APIView):
    """
    Overview for ALL outlets
    """
    def get(self, request):
        try:
            query = """
            WITH emp_summary AS (
              SELECT
                COUNT(*) AS total_emp,
                COUNT(*) FILTER (WHERE is_active = TRUE) AS active_emp,
                COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive_emp
              FROM public.main_employee
            ),
            outlet_summary AS (
              SELECT COUNT(*) AS outlet_count FROM public.main_outlet
            ),
            attendance_summary AS (
              SELECT COUNT(DISTINCT a.employee_id) AS present_emp
              FROM public.main_attendance a
              WHERE a.date = CURRENT_DATE
                AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
            ),
            leave_today AS (
              SELECT COUNT(DISTINCT l.employee_id) AS on_leave
              FROM public.main_empleave l
              WHERE l.leave_date = CURRENT_DATE
                AND LOWER(l.status) = 'approved'
            ),
            pending_leaves AS (
              SELECT COUNT(*) AS pending_leave_req
              FROM public.main_empleave
              WHERE LOWER(status) = 'pending'
            )
            SELECT
              e.total_emp,
              e.active_emp,
              e.inactive_emp,
              o.outlet_count AS outlets,
              COALESCE(a.present_emp, 0) AS present,
              COALESCE(l.on_leave, 0) AS on_leave,
              (e.active_emp - COALESCE(a.present_emp, 0) - COALESCE(l.on_leave, 0)) AS absentee,
              p.pending_leave_req
            FROM emp_summary e
            CROSS JOIN outlet_summary o
            CROSS JOIN attendance_summary a
            CROSS JOIN leave_today l
            CROSS JOIN pending_leaves p;
            """
            rows = run_sql(query)
            data = rows[0] if rows else {}
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            print("DashboardOverviewAPIView error:", e)
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------
# 2) LeavePresenceTrendAPIView (last N days)
# ------------------------------------------------
class LeavePresenceTrendAPIView(APIView):
    """
    Trend for last N days (default 7). Query param: ?days=7 (max 30)
    """
    def get(self, request):
        try:
            days = int(request.query_params.get("days", 7))
            if days < 1 or days > 30:
                return Response({"detail": "days must be between 1 and 30"}, status=status.HTTP_400_BAD_REQUEST)

            # We will use INTERVAL placeholders - pass days as string to avoid SQL injection via formatting
            query = """
            WITH active_emp AS (
              SELECT employee_id FROM public.main_employee WHERE is_active = TRUE
            ),
            dates AS (
              SELECT generate_series(CURRENT_DATE - INTERVAL '%s days'::interval + INTERVAL '1 day', CURRENT_DATE, INTERVAL '1 day')::date AS date
            ),
            present_summary AS (
              SELECT a.date::date AS date, COUNT(DISTINCT a.employee_id) AS present_count
              FROM public.main_attendance a
              INNER JOIN active_emp e ON e.employee_id = a.employee_id
              WHERE a.date BETWEEN CURRENT_DATE - INTERVAL '%s days'::interval + INTERVAL '1 day' AND CURRENT_DATE
                AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
              GROUP BY a.date::date
            ),
            leave_summary AS (
              SELECT l.leave_date::date AS date, COUNT(DISTINCT l.employee_id) AS leave_count
              FROM public.main_empleave l
              INNER JOIN active_emp e ON e.employee_id = l.employee_id
              WHERE l.leave_date BETWEEN CURRENT_DATE - INTERVAL '%s days'::interval + INTERVAL '1 day' AND CURRENT_DATE
                AND LOWER(l.status) = 'approved'
              GROUP BY l.leave_date::date
            ),
            total_emp AS (
              SELECT COUNT(*) AS active_count FROM active_emp
            )
            SELECT
              to_char(d.date, 'DD-Mon') AS date_label,
              COALESCE(l.leave_count, 0) AS leave,
              COALESCE(p.present_count, 0) AS present,
              (t.active_count - COALESCE(p.present_count, 0) - COALESCE(l.leave_count, 0)) AS not_marked
            FROM dates d
            CROSS JOIN total_emp t
            LEFT JOIN present_summary p ON d.date = p.date
            LEFT JOIN leave_summary l ON d.date = l.date
            ORDER BY d.date;
            """
            params = [days, days, days]
            rows = run_sql(query, params)
            return Response(rows, status=status.HTTP_200_OK)
        except Exception as e:
            print("LeavePresenceTrendAPIView error:", e)
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------
# 3) OutletSummaryAPIView (today)
# ------------------------------------------------
class OutletSummaryAPIView(APIView):
    """
    Summary per outlet for TODAY.
    """
    def get(self, request):
        try:
            query = """
            WITH
            emp_outlet AS (
              SELECT eo.outlet_id, e.employee_id
              FROM public.main_employee_outlets eo
              INNER JOIN public.main_employee e ON e.employee_id = eo.employee_id
              WHERE e.is_active = TRUE
            ),
            present AS (
              SELECT DISTINCT a.employee_id
              FROM public.main_attendance a
              WHERE a.date = CURRENT_DATE
                AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
            ),
            on_leave AS (
              SELECT DISTINCT l.employee_id
              FROM public.main_empleave l
              WHERE l.leave_date = CURRENT_DATE
                AND LOWER(l.status) = 'approved'
            )
            SELECT
              o.id AS outlet_id,
              o.name,
              COUNT(DISTINCT eo.employee_id) AS totalemp,
              COUNT(DISTINCT eo.employee_id) FILTER (WHERE eo.employee_id IN (SELECT employee_id FROM present)) AS presentemp,
              COUNT(DISTINCT eo.employee_id) FILTER (WHERE eo.employee_id IN (SELECT employee_id FROM on_leave)) AS onleave,
              COUNT(DISTINCT eo.employee_id)
                - COUNT(DISTINCT eo.employee_id) FILTER (WHERE eo.employee_id IN (SELECT employee_id FROM present))
                - COUNT(DISTINCT eo.employee_id) FILTER (WHERE eo.employee_id IN (SELECT employee_id FROM on_leave))
                AS absentemp
            FROM emp_outlet eo
            INNER JOIN public.main_outlet o ON o.id = eo.outlet_id
            GROUP BY o.id, o.name
            ORDER BY o.id;
            """
            rows = run_sql(query)
            return Response(rows, status=status.HTTP_200_OK)
        except Exception as e:
            print("OutletSummaryAPIView error:", e)
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------
# 4) EmployeeAttendanceSummaryAPIView (current month)
# ------------------------------------------------
class EmployeeAttendanceSummaryAPIView(APIView):
    """
    Summary per active employee for current month.
    """
    def get(self, request):
        try:
            query = """
            WITH
            emp_outlet AS (
              SELECT e.employee_id,
                     u.first_name AS fullname,
                     u.username AS empcode,
                     o.name AS outlet_name
              FROM public.main_employee e
              LEFT JOIN public.auth_user u ON u.id = e.user_id
              LEFT JOIN public.main_employee_outlets eo ON eo.employee_id = e.employee_id
              LEFT JOIN public.main_outlet o ON o.id = eo.outlet_id
              WHERE e.is_active = TRUE
            ),
            date_range AS (
              SELECT generate_series(date_trunc('month', CURRENT_DATE)::date, CURRENT_DATE, '1 day'::interval) AS day
            ),
            present_days AS (
              SELECT a.employee_id, COUNT(DISTINCT a.date) AS present_days
              FROM public.main_attendance a
              WHERE a.date >= date_trunc('month', CURRENT_DATE)
                AND a.date <= CURRENT_DATE
                AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
              GROUP BY a.employee_id
            ),
            leave_days AS (
              SELECT l.employee_id, COUNT(DISTINCT l.leave_date) AS leave_days
              FROM public.main_empleave l
              WHERE l.leave_date >= date_trunc('month', CURRENT_DATE)
                AND l.leave_date <= CURRENT_DATE
                AND LOWER(l.status) = 'approved'
              GROUP BY l.employee_id
            ),
            working_days AS (SELECT COUNT(*) AS total_days FROM date_range)
            SELECT
              eo.employee_id,
              eo.outlet_name,
              eo.fullname,
              eo.empcode,
              COALESCE(pd.present_days, 0) AS present_days,
              COALESCE(ld.leave_days, 0) AS leave_days,
              wd.total_days - COALESCE(pd.present_days, 0) - COALESCE(ld.leave_days, 0) AS absent_days
            FROM emp_outlet eo
            LEFT JOIN present_days pd ON pd.employee_id = eo.employee_id
            LEFT JOIN leave_days ld ON ld.employee_id = eo.employee_id
            CROSS JOIN working_days wd
            ORDER BY eo.outlet_name, eo.fullname;
            """
            rows = run_sql(query)
            return Response(rows, status=status.HTTP_200_OK)
        except Exception as e:
            print("EmployeeAttendanceSummaryAPIView error:", e)
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------
# 5) Outlet-filtered endpoints (By outlet_id param or query param)
# ------------------------------------------------
class DashboardOverviewByOutletAPIView(APIView):
    """
    Dashboard overview filtered by outlet_id.
    Accepts outlet_id as path param or ?outlet_id=<id> as query param.
    """
    def get(self, request, outlet_id=None):
        try:
            # allow both path param and query param
            if outlet_id is None:
                outlet_id = request.query_params.get('outlet_id', None)

            # treat 'all' or empty as None
            if outlet_id in ('all', '', None):
                # fallback to global overview
                return DashboardOverviewAPIView().get(request)

            query = """
            WITH filtered_employees AS (
              SELECT e.employee_id, e.is_active
              FROM public.main_employee e
              INNER JOIN public.main_employee_outlets eo ON eo.employee_id = e.employee_id
              WHERE eo.outlet_id = %s
            ),
            emp_summary AS (
              SELECT
                COUNT(fe.employee_id) AS total_emp,
                COUNT(fe.employee_id) FILTER (WHERE fe.is_active = TRUE) AS active_emp,
                COUNT(fe.employee_id) FILTER (WHERE fe.is_active = FALSE) AS inactive_emp
              FROM filtered_employees fe
            ),
            attendance_summary AS (
              SELECT COUNT(DISTINCT a.employee_id) AS present_emp
              FROM public.main_attendance a
              INNER JOIN filtered_employees fe ON fe.employee_id = a.employee_id
              WHERE a.date = CURRENT_DATE
                AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
            ),
            leave_today AS (
              SELECT COUNT(DISTINCT l.employee_id) AS on_leave
              FROM public.main_empleave l
              INNER JOIN filtered_employees fe ON fe.employee_id = l.employee_id
              WHERE l.leave_date = CURRENT_DATE
                AND LOWER(l.status) = 'approved'
            ),
            pending_leaves AS (
              SELECT COUNT(*) AS pending_leave_req
              FROM public.main_empleave l
              INNER JOIN filtered_employees fe ON fe.employee_id = l.employee_id
              WHERE LOWER(l.status) = 'pending'
            ),
            outlet_summary AS (SELECT 1 AS outlet_count) -- since single outlet selected
            SELECT
              e.total_emp,
              e.active_emp,
              e.inactive_emp,
              o.outlet_count AS outlets,
              COALESCE(a.present_emp, 0) AS present,
              COALESCE(l.on_leave, 0) AS on_leave,
              (e.active_emp - COALESCE(a.present_emp, 0) - COALESCE(l.on_leave, 0)) AS absentee,
              p.pending_leave_req
            FROM emp_summary e
            CROSS JOIN outlet_summary o
            CROSS JOIN attendance_summary a
            CROSS JOIN leave_today l
            CROSS JOIN pending_leaves p;
            """
            rows = run_sql(query, [int(outlet_id)])
            data = rows[0] if rows else {}
            data['filter_outlet_id'] = int(outlet_id)
            return Response(data, status=status.HTTP_200_OK)
        except Exception as e:
            print("DashboardOverviewByOutletAPIView error:", e)
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LeavePresenceTrendByOutletAPIView(APIView):
    """
    Leave/presence trend for outlet. Use ?days=7 and ?outlet_id=ID or path param.
    """
    def get(self, request, outlet_id=None):
        try:
            days = int(request.query_params.get("days", 7))
            if days < 1 or days > 30:
                return Response({"detail": "days must be between 1 and 30"}, status=status.HTTP_400_BAD_REQUEST)

            if outlet_id is None:
                outlet_id = request.query_params.get('outlet_id', None)

            if outlet_id in ('all', '', None):
                return LeavePresenceTrendAPIView().get(request)

            query = """
            WITH active_emp AS (
              SELECT DISTINCT e.employee_id
              FROM public.main_employee e
              INNER JOIN public.main_employee_outlets eo ON eo.employee_id = e.employee_id
              WHERE e.is_active = TRUE AND eo.outlet_id = %s
            ),
            dates AS (
              SELECT generate_series(CURRENT_DATE - INTERVAL '%s days'::interval + INTERVAL '1 day', CURRENT_DATE, INTERVAL '1 day')::date AS date
            ),
            present_summary AS (
              SELECT a.date::date AS date, COUNT(DISTINCT a.employee_id) AS present_count
              FROM public.main_attendance a
              INNER JOIN active_emp e ON e.employee_id = a.employee_id
              WHERE a.date BETWEEN CURRENT_DATE - INTERVAL '%s days'::interval + INTERVAL '1 day' AND CURRENT_DATE
                AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
              GROUP BY a.date::date
            ),
            leave_summary AS (
              SELECT l.leave_date::date AS date, COUNT(DISTINCT l.employee_id) AS leave_count
              FROM public.main_empleave l
              INNER JOIN active_emp e ON e.employee_id = l.employee_id
              WHERE l.leave_date BETWEEN CURRENT_DATE - INTERVAL '%s days'::interval + INTERVAL '1 day' AND CURRENT_DATE
                AND LOWER(l.status) = 'approved'
              GROUP BY l.leave_date::date
            ),
            total_emp AS (
              SELECT COUNT(*) AS active_count FROM active_emp
            )
            SELECT
              to_char(d.date, 'DD-Mon') AS date_label,
              COALESCE(l.leave_count, 0) AS leave,
              COALESCE(p.present_count, 0) AS present,
              (t.active_count - COALESCE(p.present_count, 0) - COALESCE(l.leave_count, 0)) AS not_marked
            FROM dates d
            CROSS JOIN total_emp t
            LEFT JOIN present_summary p ON d.date = p.date
            LEFT JOIN leave_summary l ON d.date = l.date
            ORDER BY d.date;
            """
            params = [int(outlet_id), days, days, days]
            rows = run_sql(query, params)
            return Response(rows, status=status.HTTP_200_OK)
        except Exception as e:
            print("LeavePresenceTrendByOutletAPIView error:", e)
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EmployeeAttendanceSummaryByOutletAPIView(APIView):
    """
    Employee attendance summary for a specific outlet (current month).
    Accepts ?outlet_id or path param.
    """
    def get(self, request, outlet_id=None):
        try:
            if outlet_id is None:
                outlet_id = request.query_params.get('outlet_id', None)

            if outlet_id in ('all', '', None):
                return EmployeeAttendanceSummaryAPIView().get(request)

            query = """
            WITH
            emp_outlet AS (
              SELECT e.employee_id,
                     u.first_name AS fullname,
                     u.username AS empcode,
                     o.name AS outlet_name
              FROM public.main_employee e
              LEFT JOIN public.auth_user u ON u.id = e.user_id
              LEFT JOIN public.main_employee_outlets eo ON eo.employee_id = e.employee_id
              LEFT JOIN public.main_outlet o ON o.id = eo.outlet_id
              WHERE e.is_active = TRUE AND eo.outlet_id = %s
            ),
            date_range AS (
              SELECT generate_series(date_trunc('month', CURRENT_DATE)::date, CURRENT_DATE, '1 day'::interval) AS day
            ),
            present_days AS (
              SELECT a.employee_id, COUNT(DISTINCT a.date) AS present_days
              FROM public.main_attendance a
              INNER JOIN emp_outlet eo ON eo.employee_id = a.employee_id
              WHERE a.date >= date_trunc('month', CURRENT_DATE)
                AND a.date <= CURRENT_DATE
                AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
              GROUP BY a.employee_id
            ),
            leave_days AS (
              SELECT l.employee_id, COUNT(DISTINCT l.leave_date) AS leave_days
              FROM public.main_empleave l
              INNER JOIN emp_outlet eo ON eo.employee_id = l.employee_id
              WHERE l.leave_date >= date_trunc('month', CURRENT_DATE)
                AND l.leave_date <= CURRENT_DATE
                AND LOWER(l.status) = 'approved'
              GROUP BY l.employee_id
            ),
            working_days AS (SELECT COUNT(*) AS total_days FROM date_range)
            SELECT
              eo.employee_id,
              eo.outlet_name,
              eo.fullname,
              eo.empcode,
              COALESCE(pd.present_days, 0) AS present_days,
              COALESCE(ld.leave_days, 0) AS leave_days,
              wd.total_days - COALESCE(pd.present_days, 0) - COALESCE(ld.leave_days, 0) AS absent_days
            FROM emp_outlet eo
            LEFT JOIN present_days pd ON pd.employee_id = eo.employee_id
            LEFT JOIN leave_days ld ON ld.employee_id = eo.employee_id
            CROSS JOIN working_days wd
            ORDER BY eo.outlet_name, eo.fullname;
            """
            rows = run_sql(query, [int(outlet_id)])
            return Response(rows, status=status.HTTP_200_OK)
        except Exception as e:
            print("EmployeeAttendanceSummaryByOutletAPIView error:", e)
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------------------------------
# 6) Employee report (full-range) and employee details
# ------------------------------------------------
class EmployeeReportAPIView(APIView):
    """
    Full-range employee report. Query params: start_date, end_date (YYYY-MM-DD)
    """
    def get(self, request, employee_id, format=None):
        try:
            start_date_str = request.query_params.get("start_date")
            end_date_str = request.query_params.get("end_date")
            start_date, end_date = parse_dates_or_default(start_date_str, end_date_str)

            query = """
            WITH emp_outlets AS (
                SELECT
                    e.employee_id,
                    STRING_AGG(o.name, ', ') AS outlet_names,
                    ARRAY_AGG(o.id) AS outlet_ids,
                    e.user_id,
                    e.fullname,
                    e.inactive_date
                FROM public.main_employee e
                LEFT JOIN public.main_employee_outlets eo ON e.employee_id = eo.employee_id
                LEFT JOIN public.main_outlet o ON eo.outlet_id = o.id
                WHERE e.employee_id = %s
                GROUP BY e.employee_id, e.user_id, e.fullname, e.inactive_date
            ),
            dates AS (
                SELECT generate_series(%s::date, %s::date, interval '1 day')::date AS day
            ),
            attendance AS (
                SELECT
                    a.employee_id,
                    a.date AS work_date,
                    MIN(a.check_in_time) AS check_in_time,
                    MAX(a.check_out_time) AS check_out_time,
                    ROUND(EXTRACT(EPOCH FROM (MAX(a.check_out_time) - MIN(a.check_in_time))) / 3600, 2) AS worked_hours,
                    MAX(a.status) AS attendance_status,
                    JSON_AGG(a.verification_notes) FILTER (WHERE a.verification_notes IS NOT NULL) AS verification_notes
                FROM public.main_attendance a
                WHERE a.date BETWEEN %s AND %s
                  AND a.employee_id = %s
                GROUP BY a.employee_id, a.date
            ),
            leaves AS (
                SELECT
                    l.employee_id,
                    l.leave_date,
                    l.leave_refno,
                    l.remarks AS leave_remarks,
                    lt.id AS leave_type_id,
                    lt.att_type,
                    lt.att_type_name
                FROM public.main_empleave l
                LEFT JOIN public.leave_type lt ON l.leave_type_id = lt.id
                WHERE LOWER(l.status) = 'approved'
                  AND l.leave_date BETWEEN %s AND %s
                  AND l.employee_id = %s
            )
            SELECT
                eo.employee_id,
                eo.user_id,
                eo.fullname,
                u.first_name AS user_first_name,
                eo.inactive_date,
                eo.outlet_names,
                eo.outlet_ids,
                d.day AS work_date,
                a.check_in_time,
                a.check_out_time,
                a.worked_hours,
                a.attendance_status,
                a.verification_notes,
                lv.leave_refno,
                lv.leave_date,
                lv.leave_remarks,
                lv.leave_type_id,
                lv.att_type,
                lv.att_type_name
            FROM emp_outlets eo
            CROSS JOIN dates d
            LEFT JOIN attendance a ON a.employee_id = eo.employee_id AND d.day = a.work_date
            LEFT JOIN leaves lv ON lv.employee_id = eo.employee_id AND d.day = lv.leave_date
            LEFT JOIN auth_user u ON eo.user_id = u.id
            ORDER BY d.day DESC;
            """

            params = [
                employee_id,  # emp_outlets
                start_date, end_date,  # dates
                start_date, end_date, employee_id,  # attendance
                start_date, end_date, employee_id,  # leaves
            ]

            rows = run_sql(query, params)
            if not rows:
                emp_q = "SELECT employee_id, user_id, fullname, inactive_date FROM public.main_employee WHERE employee_id = %s"
                emp_rows = run_sql(emp_q, [employee_id])
                if not emp_rows:
                    return Response({"detail": "No employee found"}, status=status.HTTP_404_NOT_FOUND)
                employee_details = emp_rows[0]
                return Response({"employee_details": employee_details, "daily_report": []}, status=status.HTTP_200_OK)

            first = rows[0]
            employee_details = {
                "employee_id": first.get("employee_id"),
                "user_id": first.get("user_id"),
                "user_first_name": first.get("user_first_name"),
                "fullname": first.get("fullname"),
                "inactive_date": first.get("inactive_date"),
                "outlet_names": first.get("outlet_names"),
                "outlet_ids": first.get("outlet_ids"),
            }

            daily_report = []
            import json
            for r in rows:
                vnotes = r.get("verification_notes") or []
                if isinstance(vnotes, str):
                    try:
                        vnotes = json.loads(vnotes)
                    except Exception:
                        vnotes = [vnotes]
                entry = {
                    "work_date": r.get("work_date"),
                    "check_in_time": r.get("check_in_time"),
                    "check_out_time": r.get("check_out_time"),
                    "worked_hours": r.get("worked_hours"),
                    "attendance_status": r.get("attendance_status"),
                    "verification_notes": vnotes,
                    "leave_refno": r.get("leave_refno"),
                    "leave_remarks": r.get("leave_remarks"),
                    "leave_type_id": r.get("leave_type_id"),
                    "att_type": r.get("att_type"),
                    "att_type_name": r.get("att_type_name"),
                }
                if not entry["attendance_status"] and not entry["leave_refno"]:
                    entry["attendance_status"] = "Blank Day"
                daily_report.append(entry)

            return Response({"employee_details": employee_details, "daily_report": daily_report}, status=status.HTTP_200_OK)
        except ValueError as ve:
            return Response({"detail": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print("EmployeeReportAPIView error:", e)
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EmployeeDetailsByUserAPIView(APIView):
    """
    Returns employee details for given user_id.
    """
    def get(self, request, user_id, format=None):
        try:
            query = """
            WITH emp_outlets AS (
                SELECT
                    e.employee_id,
                    STRING_AGG(o.name, ', ') AS outlet_names,
                    ARRAY_AGG(o.id) AS outlet_ids
                FROM public.main_employee e
                LEFT JOIN public.main_employee_outlets eo ON e.employee_id = eo.employee_id
                LEFT JOIN public.main_outlet o ON eo.outlet_id = o.id
                GROUP BY e.employee_id
            )
            SELECT
                e.employee_id,
                e.user_id,
                e.fullname,
                u.first_name AS user_first_name,
                e.inactive_date,
                eo.outlet_names,
                eo.outlet_ids
            FROM public.main_employee e
            LEFT JOIN public.auth_user u ON e.user_id = u.id
            LEFT JOIN emp_outlets eo ON e.employee_id = eo.employee_id
            WHERE e.user_id = %s
            """
            rows = run_sql(query, [user_id])
            if not rows:
                return Response({"detail": "No employee data found for the given user."}, status=status.HTTP_404_NOT_FOUND)
            first = rows[0]
            employee_details = {
                "employee_id": first.get("employee_id"),
                "user_id": first.get("user_id"),
                "user_first_name": first.get("user_first_name"),
                "fullname": first.get("fullname"),
                "inactive_date": first.get("inactive_date"),
                "outlet_names": first.get("outlet_names"),
                "outlet_ids": first.get("outlet_ids"),
            }
            return Response(employee_details, status=status.HTTP_200_OK)
        except Exception as e:
            print("EmployeeDetailsByUserAPIView error:", e)
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EmployeesByManagerAPIView(APIView):
    """
    Returns all employees under a manager, grouped by outlet.
    """
    def get(self, request, user_id):
        try:
            query = """
            WITH mgr AS (
                SELECT e.employee_id, e.user_id, u.first_name AS user_first_name, e.fullname
                FROM public.main_employee e
                LEFT JOIN public.auth_user u ON u.id = e.user_id
                WHERE e.user_id = %s
            ),
            emp_outlet AS (
                SELECT 
                    eo.outlet_id,
                    o.name AS outlet_name,
                    e.employee_id,
                    u.first_name AS user_first_name,
                    e.fullname
                FROM public.main_employee e
                LEFT JOIN public.main_employee_outlets eo ON eo.employee_id = e.employee_id
                LEFT JOIN public.main_outlet o ON o.id = eo.outlet_id
                LEFT JOIN public.auth_user u ON u.id = e.user_id
            )
            SELECT * FROM mgr;
            """

            rows = run_sql(query, [user_id])
            if not rows:
                return Response({"detail": "Manager not found"}, status=404)

            manager = rows[0]

            # Now fetch employees under each outlet
            q2 = """
            SELECT 
                eo.outlet_id,
                o.name AS outlet_name,
                e.employee_id,
                u.first_name AS user_first_name,
                e.fullname
            FROM public.main_employee e
            LEFT JOIN public.main_employee_outlets eo ON eo.employee_id = e.employee_id
            LEFT JOIN public.main_outlet o ON o.id = eo.outlet_id
            LEFT JOIN public.auth_user u ON u.id = e.user_id
            ORDER BY eo.outlet_id, e.fullname;
            """
            rows2 = run_sql(q2)

            employees_by_outlet = {}
            for r in rows2:
                oid = r["outlet_id"]
                if oid not in employees_by_outlet:
                    employees_by_outlet[oid] = {
                        "outlet_name": r["outlet_name"],
                        "employees": []
                    }
                employees_by_outlet[oid]["employees"].append({
                    "employee_id": r["employee_id"],
                    "fullname": r["fullname"],
                    "user_first_name": r["user_first_name"],
                })

            return Response({
                "manager": manager,
                "employees_by_outlet": employees_by_outlet
            })

        except Exception as e:
            print("EmployeesByManagerAPIView error:", e)
            return Response({"error": "Internal server error"}, 500)

# ------------------------------------------------
# 7) EmpLeave Serializer (for future use)


class OutletLeaveListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        outlet_id = request.GET.get('outlet_id')
        start_date = parse_date(request.GET.get('start_date'))
        end_date = parse_date(request.GET.get('end_date'))

        queryset = EmpLeave.objects.select_related(
            'employee__user',
            'leave_type'
        ).prefetch_related(
            'employee__outlets'
        )

        # Filter by outlet
        if outlet_id:
            queryset = queryset.filter(employee__outlets__id=outlet_id)

        # Filter by leave_date range
        if start_date and end_date:
            queryset = queryset.filter(leave_date__range=[start_date, end_date])
        elif start_date:
            queryset = queryset.filter(leave_date__gte=start_date)
        elif end_date:
            queryset = queryset.filter(leave_date__lte=end_date)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = EmpLeaveSerializer(page if page is not None else queryset, many=True)

        if page is not None:
            return paginator.get_paginated_response(serializer.data)
        return Response({"count": queryset.count(), "results": serializer.data})



class LeaveStatusUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, leave_refno):
        try:
            leave = EmpLeave.objects.get(leave_refno=leave_refno)
        except EmpLeave.DoesNotExist:
            return Response(
                {"error": "Leave record not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get("status")

        if new_status not in ['approved', 'rejected', 'cancelled', 'pending']:
            return Response(
                {"error": "Invalid status"},
                status=status.HTTP_400_BAD_REQUEST
            )

        leave.status = new_status
        leave.action_user = request.user
        leave.action_date = timezone.now().date()
        leave.save()

        return Response({
            "message": "Leave status updated successfully",
            "leave_refno": leave.leave_refno,
            "status": leave.status
        })



class LeaveBulkCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LeaveCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        outlet_id = serializer.validated_data['outlet_id']
        employee_ids = serializer.validated_data['employee_ids']
        leave_dates = serializer.validated_data['leave_dates']
        leave_type_id = serializer.validated_data['leave_type_id']
        remarks = serializer.validated_data.get('remarks', '')

        # Verify employees belong to outlet
        employees = Employee.objects.filter(
            employee_id__in=employee_ids,
            outlets__id=outlet_id
        ).distinct()

        if employees.count() != len(employee_ids):
            return Response(
                {"detail": "Some employees do not belong to the selected outlet."},
                status=status.HTTP_400_BAD_REQUEST
            )

        leave_type = LeaveType.objects.get(id=leave_type_id)
        created_records = []

        for employee in employees:
            for leave_date in leave_dates:
                leave_record = EmpLeave.objects.create(
                    employee=employee,
                    leave_date=leave_date,
                    leave_type=leave_type,
                    remarks=remarks,
                    status='pending'
                )

                created_records.append({
                    "leave_refno": leave_record.leave_refno,
                    "employee_id": employee.employee_id,
                    "leave_date": leave_date,
                    "leave_type": leave_type.att_type_name,
                    "status": leave_record.status,
                })

        return Response(
            {"created_count": len(created_records), "records": created_records},
            status=status.HTTP_201_CREATED
        )


class OutletDataAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        try:
            employee = user.employee
        except Employee.DoesNotExist:
            return Response(
                {"detail": "User is not linked to an employee"},
                status=400
            )

        # Outlets (still manager-specific)
        outlets = employee.outlets.all()
        outlets_data = [{"id": o.id, "name": o.name} for o in outlets]

        # ✅ ALL EMPLOYEES
        employees = Employee.objects.select_related("user").prefetch_related("outlets")
        employees_data = [
            {
                "employee_id": e.employee_id,
                "username": e.user.username,
                "first_name": e.user.first_name,
                "outlet_ids": list(e.outlets.values_list("id", flat=True)),
            }
            for e in employees
        ]

        # Leave Types
        leave_types = LeaveType.objects.filter(active=True)
        leave_types_data = [
            {
                "id": lt.id,
                "att_type": lt.att_type,
                "att_type_name": lt.att_type_name,
            }
            for lt in leave_types
        ]

        return Response({
            "outlets": outlets_data,
            "employees": employees_data,
            "leave_types": leave_types_data,
        })


# ------------------------------------------------
# Empoyee Refernga image 

def employee_to_dict(emp):
    return {
        "employee_id": emp.employee_id,

        # Auth User fields
        "username": emp.user.username,
        "first_name": emp.user.first_name,

        # Employee fields
        "fullname": emp.fullname,
        "reference_photo": emp.reference_photo.url if emp.reference_photo else None,
        "punchin_selfie": emp.punchin_selfie.url if emp.punchin_selfie else None,
        "punchout_selfie": emp.punchout_selfie.url if emp.punchout_selfie else None,
    }

class EmployeeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employees = Employee.objects.select_related('user').all()

        # Apply search filter
        search = request.query_params.get('search', '').strip()
        if search:
            q = Q(fullname__icontains=search) | Q(user__first_name__icontains=search) | Q(user__username__icontains=search)
            try:
                q |= Q(employee_id=int(search))
            except ValueError:
                pass
            employees = employees.filter(q)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(employees, request)
        data = [employee_to_dict(emp) for emp in (page if page is not None else employees)]
        if page is not None:
            return paginator.get_paginated_response(data)
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            user = User.objects.get(id=request.data.get("user_id"))

            employee = Employee.objects.create(
                user=user,
                fullname=request.data.get("fullname"),
                reference_photo=request.FILES.get("reference_photo"),
                punchin_selfie=request.FILES.get("punchin_selfie"),
                punchout_selfie=request.FILES.get("punchout_selfie"),
            )

            return Response(employee_to_dict(employee), status=status.HTTP_201_CREATED)

        except User.DoesNotExist:
            return Response(
                {"error": "Invalid user_id"},
                status=status.HTTP_400_BAD_REQUEST
            )
class EmployeeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        return Employee.objects.select_related('user').get(employee_id=pk)

    def get(self, request, pk):
        try:
            emp = self.get_object(pk)
            return Response(employee_to_dict(emp), status=status.HTTP_200_OK)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, pk):
        try:
            emp = self.get_object(pk)

            emp.fullname = request.data.get("fullname", emp.fullname)

            # ✅ ADD THIS BLOCK (DELETE IMAGES)
            if request.data.get("clear_images") == "true":
                emp.reference_photo = None
                emp.punchin_selfie = None
                emp.punchout_selfie = None

            # Existing logic (keep this)
            if "reference_photo" in request.FILES:
                emp.reference_photo = request.FILES["reference_photo"]

            if "punchin_selfie" in request.FILES:
                emp.punchin_selfie = request.FILES["punchin_selfie"]

            if "punchout_selfie" in request.FILES:
                emp.punchout_selfie = request.FILES["punchout_selfie"]

            emp.save()
            return Response(employee_to_dict(emp), status=status.HTTP_200_OK)

        except Employee.DoesNotExist:
            return Response({"error": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)


    def delete(self, request, pk):
        try:
            emp = self.get_object(pk)
            emp.delete()
            return Response({"message": "Employee deleted"}, status=status.HTTP_204_NO_CONTENT)

        except Employee.DoesNotExist:
            return Response({"error": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)


# =============================================================================
# Admin Outlet Summary — range-native aggregation endpoints
# All accept ?start_date=YYYY-MM-DD & ?end_date=YYYY-MM-DD (default: this month).
# =============================================================================

def _parse_range(request):
    sd_raw = request.query_params.get('start_date')
    ed_raw = request.query_params.get('end_date')
    return parse_dates_or_default(sd_raw, ed_raw)


def _user_outlet_scope(user):
    """Return (is_admin, outlet_ids).
    Admin/superuser → (True, None)  — no restriction.
    Other users → (False, [ids])    — restricted to their assigned outlets.
    """
    if user.is_staff or user.is_superuser or user.groups.filter(name__iexact='Admin').exists():
        return True, None
    emp = getattr(user, 'employee', None)
    if not emp:
        return False, []
    return False, list(emp.outlets.values_list('id', flat=True))


class OutletSummaryOverviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sd, ed = _parse_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        is_admin, outlet_ids = _user_outlet_scope(request.user)
        if not is_admin and not outlet_ids:
            return Response({
                "total_emp": 0, "active_emp": 0, "inactive_emp": 0,
                "outlets": 0, "present_days": 0, "leave_days": 0,
                "absent_days": 0, "possible_emp_days": 0,
                "pending_leave_req": 0, "present_rate": 0,
                "start_date": sd.isoformat(), "end_date": ed.isoformat(),
            })

        # Build an emp-scope CTE — employees whose PRIMARY outlet is in scope
        # (Never match via M2M, so employees in 2+ outlets aren't double-counted.)
        if is_admin:
            scoped_emp_cte = (
                "scoped_emp AS ("
                "  SELECT employee_id FROM public.main_employee"
                "  WHERE is_active = TRUE AND primary_outlet_id IS NOT NULL"
                ")"
            )
            outlet_count_sql = "(SELECT COUNT(*) FROM public.main_outlet)"
            pending_sql = "(SELECT COUNT(*) FROM public.main_empleave WHERE LOWER(status) = 'pending')"
            params = [sd, ed, sd, ed, sd, ed]
        else:
            scoped_emp_cte = (
                "scoped_emp AS ("
                "  SELECT employee_id FROM public.main_employee"
                "  WHERE is_active = TRUE AND primary_outlet_id = ANY(%s)"
                ")"
            )
            outlet_count_sql = "%s::int"
            pending_sql = (
                "(SELECT COUNT(*) FROM public.main_empleave l "
                " WHERE LOWER(l.status) = 'pending' "
                "   AND l.employee_id IN (SELECT employee_id FROM scoped_emp))"
            )
            params = [outlet_ids, sd, ed, sd, ed, sd, ed, len(outlet_ids)]

        query = f"""
        WITH {scoped_emp_cte},
        emp_summary AS (
          SELECT
            (SELECT COUNT(*) FROM scoped_emp) AS total_emp,
            (SELECT COUNT(*) FROM scoped_emp) AS active_emp,
            0 AS inactive_emp
        ),
        dates AS (
          SELECT generate_series(%s::date, %s::date, INTERVAL '1 day')::date AS d
        ),
        present_days AS (
          SELECT COUNT(*) AS c
          FROM public.main_attendance a
          INNER JOIN scoped_emp e ON e.employee_id = a.employee_id
          WHERE a.date BETWEEN %s AND %s
            AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
        ),
        leave_days AS (
          SELECT COUNT(*) AS c
          FROM public.main_empleave l
          INNER JOIN scoped_emp e ON e.employee_id = l.employee_id
          WHERE l.leave_date BETWEEN %s AND %s
            AND LOWER(l.status) = 'approved'
        ),
        totals AS (
          SELECT (SELECT COUNT(*) FROM scoped_emp) * (SELECT COUNT(*) FROM dates) AS possible_emp_days
        )
        SELECT
          e.total_emp,
          e.active_emp,
          e.inactive_emp,
          {outlet_count_sql} AS outlets,
          COALESCE(p.c, 0) AS present_days,
          COALESCE(l.c, 0) AS leave_days,
          GREATEST(t.possible_emp_days - COALESCE(p.c, 0) - COALESCE(l.c, 0), 0) AS absent_days,
          t.possible_emp_days,
          {pending_sql} AS pending_leave_req,
          CASE WHEN t.possible_emp_days > 0
            THEN ROUND(COALESCE(p.c, 0)::numeric * 100 / t.possible_emp_days, 1)
            ELSE 0 END AS present_rate
        FROM emp_summary e
        CROSS JOIN totals t
        LEFT JOIN present_days p ON TRUE
        LEFT JOIN leave_days l ON TRUE;
        """
        try:
            rows = run_sql(query, params)
            data = rows[0] if rows else {}
            data['start_date'] = sd.isoformat()
            data['end_date'] = ed.isoformat()
            return Response(data)
        except Exception as e:
            print("OutletSummaryOverviewAPIView error:", e)
            return Response({"error": "Internal server error"}, status=500)


class OutletSummaryTrendAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sd, ed = _parse_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        is_admin, scope_outlet_ids = _user_outlet_scope(request.user)

        outlet_id = request.query_params.get('outlet_id')
        primary_filter = ""
        leading_params = []
        if outlet_id:
            try:
                outlet_id = int(outlet_id)
            except (TypeError, ValueError):
                return Response({"error": "Invalid outlet_id"}, status=400)
            if not is_admin and outlet_id not in (scope_outlet_ids or []):
                return Response({"error": "You are not assigned to this outlet."}, status=403)
            primary_filter = "AND e.primary_outlet_id = %s"
            leading_params.append(outlet_id)
        elif not is_admin:
            if not scope_outlet_ids:
                return Response([])
            primary_filter = "AND e.primary_outlet_id = ANY(%s)"
            leading_params.append(scope_outlet_ids)

        params = leading_params + [sd, ed, sd, ed, sd, ed]

        query = f"""
        WITH active_emp AS (
          SELECT e.employee_id FROM public.main_employee e
          WHERE e.is_active = TRUE AND e.primary_outlet_id IS NOT NULL {primary_filter}
        ),
        dates AS (
          SELECT generate_series(%s::date, %s::date, INTERVAL '1 day')::date AS d
        ),
        present_summary AS (
          SELECT a.date::date AS d, COUNT(DISTINCT a.employee_id) AS c
          FROM public.main_attendance a
          INNER JOIN active_emp ae ON ae.employee_id = a.employee_id
          WHERE a.date BETWEEN %s AND %s
            AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
          GROUP BY a.date::date
        ),
        leave_summary AS (
          SELECT l.leave_date::date AS d, COUNT(DISTINCT l.employee_id) AS c
          FROM public.main_empleave l
          INNER JOIN active_emp ae ON ae.employee_id = l.employee_id
          WHERE l.leave_date BETWEEN %s AND %s
            AND LOWER(l.status) = 'approved'
          GROUP BY l.leave_date::date
        ),
        total_emp AS (SELECT COUNT(*) AS c FROM active_emp)
        SELECT
          to_char(dt.d, 'YYYY-MM-DD') AS date,
          to_char(dt.d, 'DD Mon') AS date_label,
          COALESCE(p.c, 0) AS present,
          COALESCE(l.c, 0) AS leave,
          GREATEST(t.c - COALESCE(p.c, 0) - COALESCE(l.c, 0), 0) AS not_marked
        FROM dates dt
        CROSS JOIN total_emp t
        LEFT JOIN present_summary p ON p.d = dt.d
        LEFT JOIN leave_summary l ON l.d = dt.d
        ORDER BY dt.d;
        """
        try:
            rows = run_sql(query, params)
            return Response(rows)
        except Exception as e:
            print("OutletSummaryTrendAPIView error:", e)
            return Response({"error": "Internal server error"}, status=500)


class OutletSummaryOutletsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sd, ed = _parse_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        is_admin, scope_outlet_ids = _user_outlet_scope(request.user)
        if not is_admin and not scope_outlet_ids:
            return Response([])

        outlet_filter_sql = ""
        outer_filter_sql = ""
        extra_params = []
        if not is_admin:
            outlet_filter_sql = "AND e.primary_outlet_id = ANY(%s)"
            outer_filter_sql = "WHERE o.id = ANY(%s)"
            extra_params = [scope_outlet_ids]

        query = f"""
        WITH
        date_range AS (
          SELECT generate_series(%s::date, %s::date, INTERVAL '1 day')::date AS d
        ),
        days_count AS (SELECT COUNT(*) AS n FROM date_range),
        emp_outlet AS (
          SELECT e.primary_outlet_id AS outlet_id, e.employee_id
          FROM public.main_employee e
          WHERE e.is_active = TRUE AND e.primary_outlet_id IS NOT NULL {outlet_filter_sql}
        ),
        present_rows AS (
          SELECT eo.outlet_id, COUNT(*) AS c
          FROM public.main_attendance a
          INNER JOIN emp_outlet eo ON eo.employee_id = a.employee_id
          WHERE a.date BETWEEN %s AND %s
            AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
          GROUP BY eo.outlet_id
        ),
        leave_rows AS (
          SELECT eo.outlet_id, COUNT(*) AS c
          FROM public.main_empleave l
          INNER JOIN emp_outlet eo ON eo.employee_id = l.employee_id
          WHERE l.leave_date BETWEEN %s AND %s
            AND LOWER(l.status) = 'approved'
          GROUP BY eo.outlet_id
        ),
        outlet_totals AS (
          SELECT outlet_id, COUNT(*) AS total_emp FROM emp_outlet GROUP BY outlet_id
        ),
        outlet_manager AS (
          SELECT o.id AS outlet_id, e.fullname AS manager_name
          FROM public.main_outlet o
          LEFT JOIN public.main_employee e ON e.employee_id = o.manager_id
        )
        SELECT
          o.id AS outlet_id,
          o.name,
          o.address,
          COALESCE(om.manager_name, NULL) AS manager_name,
          COALESCE(ot.total_emp, 0) AS total_emp,
          COALESCE(p.c, 0) AS present_days,
          COALESCE(l.c, 0) AS leave_days,
          GREATEST(
            COALESCE(ot.total_emp, 0) * (SELECT n FROM days_count)
            - COALESCE(p.c, 0) - COALESCE(l.c, 0), 0
          ) AS absent_days,
          COALESCE(ot.total_emp, 0) * (SELECT n FROM days_count) AS possible_days,
          CASE WHEN COALESCE(ot.total_emp, 0) > 0
            THEN ROUND(COALESCE(p.c, 0)::numeric * 100
                 / NULLIF(ot.total_emp * (SELECT n FROM days_count), 0), 1)
            ELSE 0 END AS present_rate
        FROM public.main_outlet o
        LEFT JOIN outlet_totals ot ON ot.outlet_id = o.id
        LEFT JOIN present_rows p ON p.outlet_id = o.id
        LEFT JOIN leave_rows l ON l.outlet_id = o.id
        LEFT JOIN outlet_manager om ON om.outlet_id = o.id
        {outer_filter_sql}
        ORDER BY o.name;
        """
        # param order: [sd, ed] then emp_outlet filter, then 2× range filters, then outer filter
        params = [sd, ed]
        if not is_admin:
            params += extra_params  # outlet_id filter inside emp_outlet
        params += [sd, ed, sd, ed]
        if not is_admin:
            params += extra_params  # outer filter
        try:
            rows = run_sql(query, params)
            return Response(rows)
        except Exception as e:
            print("OutletSummaryOutletsAPIView error:", e)
            return Response({"error": "Internal server error"}, status=500)


class OutletSummaryOutletEmployeesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, outlet_id):
        try:
            sd, ed = _parse_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        is_admin, scope_outlet_ids = _user_outlet_scope(request.user)
        if not is_admin and outlet_id not in (scope_outlet_ids or []):
            return Response({"error": "You are not assigned to this outlet."}, status=403)

        query = """
        WITH
        date_range AS (
          SELECT generate_series(%s::date, %s::date, INTERVAL '1 day')::date AS d
        ),
        days_count AS (SELECT COUNT(*) AS n FROM date_range),
        emp_outlet AS (
          SELECT e.employee_id, e.fullname, e.empcode
          FROM public.main_employee e
          WHERE e.is_active = TRUE AND e.primary_outlet_id = %s
        ),
        present_days AS (
          SELECT a.employee_id, COUNT(DISTINCT a.date) AS c
          FROM public.main_attendance a
          WHERE a.date BETWEEN %s AND %s
            AND (LOWER(a.status) IN ('present','late') OR a.status = '1')
          GROUP BY a.employee_id
        ),
        leave_days AS (
          SELECT l.employee_id, COUNT(DISTINCT l.leave_date) AS c
          FROM public.main_empleave l
          WHERE l.leave_date BETWEEN %s AND %s
            AND LOWER(l.status) = 'approved'
          GROUP BY l.employee_id
        )
        SELECT
          eo.employee_id,
          eo.fullname,
          eo.empcode,
          COALESCE(pd.c, 0) AS present_days,
          COALESCE(ld.c, 0) AS leave_days,
          GREATEST((SELECT n FROM days_count) - COALESCE(pd.c, 0) - COALESCE(ld.c, 0), 0) AS absent_days,
          (SELECT n FROM days_count) AS total_days,
          CASE WHEN (SELECT n FROM days_count) > 0
            THEN ROUND(COALESCE(pd.c, 0)::numeric * 100 / (SELECT n FROM days_count), 1)
            ELSE 0 END AS present_rate
        FROM emp_outlet eo
        LEFT JOIN present_days pd ON pd.employee_id = eo.employee_id
        LEFT JOIN leave_days ld ON ld.employee_id = eo.employee_id
        ORDER BY eo.fullname;
        """
        try:
            rows = run_sql(query, [sd, ed, outlet_id, sd, ed, sd, ed])
            return Response(rows)
        except Exception as e:
            print("OutletSummaryOutletEmployeesAPIView error:", e)
            return Response({"error": "Internal server error"}, status=500)


# =============================================================================
# Reports Section — 4 new range-native report endpoints
# All respect outlet scope (admin → everyone, manager → primary_outlet in their outlets)
# =============================================================================

def _scoped_emp_sql(is_admin, outlet_ids):
    """Return (sql_fragment, params) that yields a scoped_emp CTE."""
    if is_admin:
        return (
            "scoped_emp AS ("
            "  SELECT e.employee_id, e.fullname, e.empcode,"
            "         o.id AS primary_outlet_id, o.name AS primary_outlet_name"
            "  FROM public.main_employee e"
            "  LEFT JOIN public.main_outlet o ON o.id = e.primary_outlet_id"
            "  WHERE e.is_active = TRUE AND e.primary_outlet_id IS NOT NULL"
            ")",
            [],
        )
    return (
        "scoped_emp AS ("
        "  SELECT e.employee_id, e.fullname, e.empcode,"
        "         o.id AS primary_outlet_id, o.name AS primary_outlet_name"
        "  FROM public.main_employee e"
        "  LEFT JOIN public.main_outlet o ON o.id = e.primary_outlet_id"
        "  WHERE e.is_active = TRUE AND e.primary_outlet_id = ANY(%s)"
        ")",
        [outlet_ids],
    )


class MonthlySheetAPIView(APIView):
    """Payroll-style grid: rows = employees, columns = days, cells = status code."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sd, ed = _parse_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        is_admin, outlet_ids = _user_outlet_scope(request.user)
        if not is_admin and not outlet_ids:
            return Response({"employees": [], "dates": [], "cells": {}, "holidays": []})

        scoped_cte, scope_params = _scoped_emp_sql(is_admin, outlet_ids)

        # Employees
        emp_query = f"WITH {scoped_cte} SELECT * FROM scoped_emp ORDER BY primary_outlet_name, fullname;"
        employees = run_sql(emp_query, scope_params)
        emp_ids = [e['employee_id'] for e in employees]

        # Date series
        dates_rows = run_sql(
            "SELECT to_char(d, 'YYYY-MM-DD') AS d FROM generate_series(%s::date, %s::date, INTERVAL '1 day') d ORDER BY d",
            [sd, ed],
        )
        dates = [r['d'] for r in dates_rows]

        # Attendance status per emp per day
        att = run_sql(
            "SELECT employee_id, to_char(date, 'YYYY-MM-DD') AS d, status "
            "FROM public.main_attendance "
            "WHERE employee_id = ANY(%s) AND date BETWEEN %s AND %s",
            [emp_ids, sd, ed],
        ) if emp_ids else []

        # Approved leaves per emp per day
        leaves = run_sql(
            "SELECT employee_id, to_char(leave_date, 'YYYY-MM-DD') AS d "
            "FROM public.main_empleave "
            "WHERE employee_id = ANY(%s) AND leave_date BETWEEN %s AND %s "
            "  AND LOWER(status) = 'approved'",
            [emp_ids, sd, ed],
        ) if emp_ids else []

        # Holidays (active)
        hol = run_sql(
            "SELECT to_char(hdate, 'YYYY-MM-DD') AS d FROM public.holiday "
            "WHERE active = TRUE AND hdate BETWEEN %s AND %s",
            [sd, ed],
        )
        holidays = sorted({r['d'] for r in hol})

        def code(status):
            s = (status or '').lower()
            if s in ('present', '1'): return 'P'
            if s == 'late': return 'L'
            if s == 'half day': return 'H'
            if s == 'on leave': return 'V'
            if s == 'absent': return 'A'
            return '-'

        cells = {eid: {} for eid in emp_ids}
        for row in att:
            cells[row['employee_id']][row['d']] = code(row['status'])
        for row in leaves:
            # Only fill if no attendance row already present (attendance wins)
            if row['d'] not in cells.get(row['employee_id'], {}):
                cells[row['employee_id']][row['d']] = 'V'

        return Response({
            "start_date": sd.isoformat(),
            "end_date": ed.isoformat(),
            "employees": employees,
            "dates": dates,
            "cells": cells,
            "holidays": holidays,
        })


class LateComersAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sd, ed = _parse_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        is_admin, outlet_ids = _user_outlet_scope(request.user)
        if not is_admin and not outlet_ids:
            return Response([])

        scoped_cte, scope_params = _scoped_emp_sql(is_admin, outlet_ids)

        query = f"""
        WITH {scoped_cte},
        att AS (
          SELECT a.employee_id,
                 COUNT(*) FILTER (WHERE LOWER(a.status) = 'late') AS late_days,
                 COUNT(*) AS total_records
          FROM public.main_attendance a
          INNER JOIN scoped_emp s ON s.employee_id = a.employee_id
          WHERE a.date BETWEEN %s AND %s
          GROUP BY a.employee_id
        )
        SELECT s.employee_id, s.fullname, s.empcode,
               s.primary_outlet_id, s.primary_outlet_name,
               COALESCE(att.late_days, 0) AS late_days,
               COALESCE(att.total_records, 0) AS total_records,
               CASE WHEN COALESCE(att.total_records, 0) > 0
                 THEN ROUND(COALESCE(att.late_days, 0)::numeric * 100 / att.total_records, 1)
                 ELSE 0 END AS late_rate
        FROM scoped_emp s
        LEFT JOIN att ON att.employee_id = s.employee_id
        WHERE COALESCE(att.late_days, 0) > 0
        ORDER BY late_days DESC, s.fullname;
        """
        try:
            rows = run_sql(query, scope_params + [sd, ed])
            return Response(rows)
        except Exception as e:
            print("LateComersAPIView error:", e)
            return Response({"error": "Internal server error"}, status=500)


class AbsenteeismAPIView(APIView):
    """Per-employee absent day count over a range. ?min_days=N filters out low counts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sd, ed = _parse_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        try:
            min_days = int(request.query_params.get('min_days', 0) or 0)
        except (TypeError, ValueError):
            min_days = 0

        is_admin, outlet_ids = _user_outlet_scope(request.user)
        if not is_admin and not outlet_ids:
            return Response([])

        scoped_cte, scope_params = _scoped_emp_sql(is_admin, outlet_ids)

        query = f"""
        WITH {scoped_cte},
        date_range AS (SELECT generate_series(%s::date, %s::date, INTERVAL '1 day')::date AS d),
        days_count AS (SELECT COUNT(*) AS n FROM date_range),
        present AS (
          SELECT a.employee_id, COUNT(DISTINCT a.date) AS c
          FROM public.main_attendance a
          WHERE a.date BETWEEN %s AND %s
            AND (LOWER(a.status) IN ('present','late','half day') OR a.status = '1')
          GROUP BY a.employee_id
        ),
        leaves AS (
          SELECT l.employee_id, COUNT(DISTINCT l.leave_date) AS c
          FROM public.main_empleave l
          WHERE l.leave_date BETWEEN %s AND %s
            AND LOWER(l.status) = 'approved'
          GROUP BY l.employee_id
        )
        SELECT s.employee_id, s.fullname, s.empcode,
               s.primary_outlet_id, s.primary_outlet_name,
               (SELECT n FROM days_count) AS total_days,
               COALESCE(p.c, 0) AS present_days,
               COALESCE(l.c, 0) AS leave_days,
               GREATEST((SELECT n FROM days_count) - COALESCE(p.c, 0) - COALESCE(l.c, 0), 0) AS absent_days,
               CASE WHEN (SELECT n FROM days_count) > 0
                 THEN ROUND(GREATEST((SELECT n FROM days_count) - COALESCE(p.c, 0) - COALESCE(l.c, 0), 0)::numeric
                            * 100 / (SELECT n FROM days_count), 1)
                 ELSE 0 END AS absent_rate
        FROM scoped_emp s
        LEFT JOIN present p ON p.employee_id = s.employee_id
        LEFT JOIN leaves l ON l.employee_id = s.employee_id
        WHERE GREATEST((SELECT n FROM days_count) - COALESCE(p.c, 0) - COALESCE(l.c, 0), 0) >= %s
        ORDER BY absent_days DESC, s.fullname;
        """
        try:
            rows = run_sql(query, scope_params + [sd, ed, sd, ed, sd, ed, min_days])
            return Response(rows)
        except Exception as e:
            print("AbsenteeismAPIView error:", e)
            return Response({"error": "Internal server error"}, status=500)


class OvertimeAPIView(APIView):
    """Per-employee OT hours + worked hours + days-with-OT in the range."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sd, ed = _parse_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

        is_admin, outlet_ids = _user_outlet_scope(request.user)
        if not is_admin and not outlet_ids:
            return Response([])

        scoped_cte, scope_params = _scoped_emp_sql(is_admin, outlet_ids)

        query = f"""
        WITH {scoped_cte},
        att AS (
          SELECT a.employee_id,
                 COALESCE(SUM(a.ot_hours), 0) AS ot_hours,
                 COALESCE(SUM(a.worked_hours), 0) AS worked_hours,
                 COUNT(*) FILTER (WHERE COALESCE(a.ot_hours, 0) > 0) AS days_with_ot
          FROM public.main_attendance a
          INNER JOIN scoped_emp s ON s.employee_id = a.employee_id
          WHERE a.date BETWEEN %s AND %s
          GROUP BY a.employee_id
        )
        SELECT s.employee_id, s.fullname, s.empcode,
               s.primary_outlet_id, s.primary_outlet_name,
               ROUND(COALESCE(att.ot_hours, 0)::numeric, 2) AS ot_hours,
               ROUND(COALESCE(att.worked_hours, 0)::numeric, 2) AS worked_hours,
               COALESCE(att.days_with_ot, 0) AS days_with_ot
        FROM scoped_emp s
        LEFT JOIN att ON att.employee_id = s.employee_id
        WHERE COALESCE(att.ot_hours, 0) > 0
        ORDER BY ot_hours DESC, s.fullname;
        """
        try:
            rows = run_sql(query, scope_params + [sd, ed])
            return Response(rows)
        except Exception as e:
            print("OvertimeAPIView error:", e)
            return Response({"error": "Internal server error"}, status=500)
