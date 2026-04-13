from django.urls import path, include

urlpatterns = [
    path('auth/', include('mobile_api.auth.urls')),
    path('attendance/', include('mobile_api.attendance.urls')),
    path('leave/', include('mobile_api.leave.urls')),
]
