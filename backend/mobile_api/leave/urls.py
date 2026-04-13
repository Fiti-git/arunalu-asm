from django.urls import path
from . import views

urlpatterns = [
    path('my-requests/', views.my_leave_requests, name='mobile_my_leave_requests'),
    path('pending/', views.pending_leave, name='mobile_pending_leave'),
    path('apply/', views.ApplyLeaveView.as_view(), name='mobile_apply_leave'),
]
