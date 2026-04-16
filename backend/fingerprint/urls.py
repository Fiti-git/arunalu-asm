from django.urls import path
from . import views

urlpatterns = [
    path("uploads/", views.FingerprintUploadsAPIView.as_view(), name="fp_uploads"),
    path("uploads/<int:pk>/", views.FingerprintUploadDetailAPIView.as_view(), name="fp_upload_detail"),
    path("uploads/<int:pk>/rows/", views.upload_rows, name="fp_upload_rows"),
    path("uploads/<int:pk>/rematch/", views.rematch, name="fp_rematch"),
    path("uploads/<int:pk>/commit/", views.commit, name="fp_commit"),
    path("uploads/<int:pk>/revert/", views.revert, name="fp_revert"),

    path("rows/<int:pk>/", views.row_update, name="fp_row_update"),
]