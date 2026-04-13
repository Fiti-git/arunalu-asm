from django.urls import path
from .views import MobileTokenObtainPairView

urlpatterns = [
    path('token/', MobileTokenObtainPairView.as_view(), name='mobile_token_obtain_pair'),
]
