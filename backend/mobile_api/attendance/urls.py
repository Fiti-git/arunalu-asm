from django.urls import path
from . import views

urlpatterns = [
    path('today/', views.today_attendance, name='mobile_today_attendance'),
    path('punch-in/', views.punch_in, name='mobile_punch_in'),
    path('punch-out/', views.punch_out, name='mobile_punch_out'),
    path('profile/', views.employee_profile, name='mobile_employee_profile'),
    path('history/', views.attendance_history, name='mobile_attendance_history'),
]
