from django.urls import path
from . import views

urlpatterns = [
    # Allowance catalog
    path("allowance-types/", views.AllowanceTypeListCreate.as_view()),
    path("allowance-types/<int:pk>/", views.AllowanceTypeDetail.as_view()),

    # Attendance bonus tiers
    path("bonus-tiers/", views.BonusTierListCreate.as_view()),
    path("bonus-tiers/<int:pk>/", views.BonusTierDetail.as_view()),

    # Work schedule
    path("work-schedules/", views.work_schedule_list),
    path("work-schedules/<int:employee_id>/", views.work_schedule_upsert),

    # Payroll
    path("preview/<int:employee_id>/", views.payroll_preview),
    path("payrolls/", views.payroll_list_create),
    path("payrolls/<int:pk>/", views.payroll_detail),
    path("payrolls/<int:pk>/lock/", views.payroll_lock),
    path("payrolls/<int:pk>/unlock/", views.payroll_unlock),
    path("employees/", views.payroll_employee_list),

    # APIT / PAYE slabs
    path("apit-slabs/", views.APITSlabListCreate.as_view()),
    path("apit-slabs/<int:pk>/", views.APITSlabDetail.as_view()),

    # Gratuity
    path("gratuity/", views.gratuity_report),

    # Payslip PDF
    path("payrolls/<int:pk>/payslip/", views.payslip_pdf),
]
