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
    path("payrolls/<int:pk>/audit/", views.payroll_audit_log),
    path("audit/", views.payroll_audit_log),
    path("employees/", views.payroll_employee_list),

    # APIT / PAYE slabs
    path("apit-slabs/", views.APITSlabListCreate.as_view()),
    path("apit-slabs/<int:pk>/", views.APITSlabDetail.as_view()),

    # Gratuity
    path("gratuity/", views.gratuity_report),

    # Payslip PDF
    path("payrolls/<int:pk>/payslip/", views.payslip_pdf),

    # Company config (singleton)
    path("company-config/", views.company_config),

    # Employee financial profile (Employee + FinancialProfile grid)
    path("financial-profiles/", views.financial_profile_list),
    path("financial-profiles/bulk/", views.financial_profile_bulk_save),

    # Statutory & bank exports
    path("export/epf/", views.export_epf),
    path("export/etf/", views.export_etf),
    path("export/bank/", views.export_bank),

    # Per-agency payroll profiles
    path("agency-profiles/", views.agency_profile_list),
    path("agency-profiles/<int:pk>/", views.agency_profile_detail),

    # Lookup directories
    path("lookups/epf-zones/", views.epf_zone_list),
    path("lookups/epf-zones/<int:pk>/", views.epf_zone_detail),
    path("lookups/banks/", views.bank_list),
    path("lookups/banks/<int:pk>/", views.bank_detail),
    path("lookups/bank-branches/", views.bank_branch_list),
    path("lookups/bank-branches/<int:pk>/", views.bank_branch_detail),

    # Outlet EPF pattern + generator
    path("outlet-epf-patterns/", views.outlet_epf_pattern_list),
    path("outlet-epf-patterns/<int:pk>/", views.outlet_epf_pattern_detail),
    path("outlet-epf-patterns/outlet/<int:outlet_id>/generate/", views.outlet_epf_generate),
    path("employees/<int:employee_id>/generate-epf/", views.employee_epf_generate),
]
