from django.db import models


class NotificationLog(models.Model):
    CHANNEL_CHOICES = (('sms', 'SMS'), ('push', 'Push'), ('email', 'Email'))
    STATUS_CHOICES = (
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    )

    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='sms')
    recipient = models.CharField(max_length=32)
    event = models.CharField(max_length=64, blank=True)
    message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='queued')
    provider = models.CharField(max_length=32, blank=True)
    provider_response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['recipient', '-created_at'])]

    def __str__(self):
        return f'{self.channel} → {self.recipient} [{self.status}]'
