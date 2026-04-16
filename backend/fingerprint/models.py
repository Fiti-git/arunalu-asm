from django.db import models
from django.contrib.auth.models import User

from main.models import Employee, Attendance


class FingerprintUpload(models.Model):
    STATUS_CHOICES = [
        ("Staged", "Staged"),
        ("Committed", "Committed"),
        ("Reverted", "Reverted"),
    ]

    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="fingerprint_uploads"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="Staged")

    total_rows = models.IntegerField(default=0)
    matched_rows = models.IntegerField(default=0)
    ambiguous_rows = models.IntegerField(default=0)
    unmatched_rows = models.IntegerField(default=0)
    conflict_rows = models.IntegerField(default=0)

    committed_at = models.DateTimeField(null=True, blank=True)
    committed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fingerprint_commits",
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.filename} ({self.status})"


class FingerprintRow(models.Model):
    MATCH_CHOICES = [
        ("Matched", "Matched"),
        ("Ambiguous", "Ambiguous"),
        ("Unmatched", "Unmatched"),
        ("Manual", "Manual"),
    ]

    upload = models.ForeignKey(
        FingerprintUpload, on_delete=models.CASCADE, related_name="rows"
    )

    department = models.CharField(max_length=255, blank=True, default="")
    raw_name = models.CharField(max_length=255, blank=True, default="")
    parsed_empcode = models.CharField(max_length=50, blank=True, default="")
    parsed_name = models.CharField(max_length=255, blank=True, default="")

    date = models.DateField(null=True, blank=True)
    shift = models.CharField(max_length=100, blank=True, default="")
    time_period = models.CharField(max_length=100, blank=True, default="")
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)

    matched_employee = models.ForeignKey(
        Employee, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fingerprint_rows",
    )
    match_status = models.CharField(max_length=16, choices=MATCH_CHOICES, default="Unmatched")
    has_asm_conflict = models.BooleanField(default=False)
    skip_commit = models.BooleanField(default=False)

    committed_attendance = models.ForeignKey(
        Attendance, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fingerprint_rows",
    )

    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["date", "raw_name"]

    def __str__(self):
        return f"{self.raw_name} {self.date}"