from django.urls import path
from . import views

urlpatterns = [
    path("salary/<int:employee_id>/", views.EmployeeSalaryAPIView.as_view(), name="calc_salary"),
    path("preview/<int:employee_id>/", views.voucher_preview, name="calc_preview"),

    path("vouchers/", views.PaymentVoucherListCreateAPIView.as_view(), name="calc_vouchers"),
    path("vouchers/<int:pk>/", views.PaymentVoucherDetailAPIView.as_view(), name="calc_voucher_detail"),
    path("vouchers/<int:pk>/lock/", views.voucher_lock, name="calc_voucher_lock"),
    path("vouchers/<int:pk>/unlock/", views.voucher_unlock, name="calc_voucher_unlock"),

    path("employees/", views.payroll_employee_list, name="calc_employees"),

    # Outlet allocation management
    path("allocations/", views.allocation_list, name="calc_allocations"),
    path("allocations/<int:employee_id>/", views.allocation_set, name="calc_allocations_set"),

    # Payroll report
    path("payroll-report/employees/", views.payroll_report_employees, name="calc_report_employees"),
    path("payroll-report/outlet-summary/", views.payroll_report_outlet_summary, name="calc_report_outlet_summary"),
    path("payroll-report/multi-outlet/", views.payroll_report_multi_outlet, name="calc_report_multi_outlet"),
    path("payroll-report/export/", views.payroll_report_export, name="calc_report_export"),
]