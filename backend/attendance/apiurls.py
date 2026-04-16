from django.urls import path
from . import api  # Import views from the current app


urlpatterns = [
    path('punch-in/', api.punch_in, name='punch_in'),
    path('punch-out/', api.punch_out, name='punch_out'),
    path('me/', api.get_my_attendance, name='get_my_attendance'),
    path('outlet/', api.get_outlet_attendance, name='get_outlet_attendance'),
    path('get_attall/', api.get_all_attendance, name='get_all_attendance'),
    path('get_att/<int:id>/', api.get_attendance, name='get_attendance'),
    path('status/<int:id>/', api.update_attendance_status, name='update_attendance_status'),
    path('applyleave/', api.LeaveRequestAPIView.as_view(), name='leave-request'),
    path('myleaverequests/', api.my_leave_requests, name='my_leave_requests'),
    path('allleaverequests/', api.all_leave_requests, name='all_leave_requests'),
    path('outletleaverequests/', api.leave_requests_by_outlet, name='outlet_leave_requests'),
    path('pendingleave/', api.pending_leave_requests, name='pending_leave_requests'),
    path('updateleavestatus/<int:id>/', api.update_leave_status, name='update_leave_status'),
    path('report/', api.generate_report, name='generate-report'),
    path('verify/', api.VerifyAttendanceView.as_view(), name='verify-attendance'),
    path('update/', api.update_attendance, name='update_attendance'),
    path("addleave/", api.add_leave, name="add_leave_by_maanger"),
    path('bulk-add/', api.bulk_add_attendance, name='bulk-add-attendance'),
    path('bulk-addleave/', api.bulk_add_leave, name='bulk-add-leave'),
    path('bulk-addleave/v2/', api.bulk_add_leave_v2, name='bulk-add-leave-v2'),
    path('leave/<int:id>/', api.delete_leave, name='delete-leave'),

    # --- V2 endpoints (rebuilt system) ---
    path('v2/', api.v2_attendance_list, name='v2-attendance-list'),
    path('v2/update/', api.v2_attendance_update, name='v2-attendance-update'),
    path('v2/delete/', api.v2_attendance_delete, name='v2-attendance-delete'),
    path('v2/bulk-add/', api.v2_attendance_bulk_add, name='v2-attendance-bulk-add'),
    path('v2/edit-request/', api.v2_attendance_edit_request, name='v2-attendance-edit-request'),
    path('v2/edit-requests/', api.v2_attendance_edit_requests_list, name='v2-attendance-edit-requests-list'),
    path('v2/edit-requests/review/', api.v2_attendance_edit_requests_review, name='v2-attendance-edit-requests-review'),

    # --- V3 attendance management (history / add / modify / delete) ---
    path('v3/', api.v3_attendance_list, name='v3-attendance-list'),
    path('v3/bulk-add/', api.v3_attendance_bulk_add, name='v3-attendance-bulk-add'),
    # Static v3 sub-routes must come BEFORE the <int:id> catch-all
    path('v3/modification-requests/', api.v3_modification_requests_list, name='v3-mod-requests-list'),
    path('v3/modification-requests/<int:log_id>/approve/', api.v3_modification_request_approve, name='v3-mod-request-approve'),
    path('v3/modification-requests/<int:log_id>/reject/', api.v3_modification_request_reject, name='v3-mod-request-reject'),
    path('v3/lock-periods/', api.v3_lock_periods, name='v3-lock-periods'),
    path('v3/lock-periods/<int:lock_id>/', api.v3_lock_period_detail, name='v3-lock-period-detail'),
    path('v3/<int:id>/modifications/', api.v3_attendance_mod_history, name='v3-attendance-mod-history'),
    path('v3/<int:id>/', api.v3_attendance_update, name='v3-attendance-update'),
    path('v3/<int:id>/delete/', api.v3_attendance_delete, name='v3-attendance-delete'),
]