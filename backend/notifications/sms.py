"""
Pluggable SMS gateway for Sri Lankan bulk SMS providers.

Configure via env:
    SMS_PROVIDER     = textlk | smslk | console   (default: console)
    SMS_API_TOKEN    = bearer token from provider dashboard
    SMS_SENDER_ID    = approved sender mask (e.g. "ArunaluASM")

Usage:
    from notifications.sms import send_sms
    send_sms(phone="0771234567", message="...", event="leave_approved")
"""

import logging
import os
import re

import requests

from .models import NotificationLog

logger = logging.getLogger(__name__)

PROVIDER = os.getenv('SMS_PROVIDER', 'console').lower()
API_TOKEN = os.getenv('SMS_API_TOKEN', '')
SENDER_ID = os.getenv('SMS_SENDER_ID', 'ASM')


def _normalize_phone(phone: str) -> str:
    """Return E.164-ish Sri Lanka number: 94XXXXXXXXX (no +)."""
    if not phone:
        return ''
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('94'):
        return digits
    if digits.startswith('0'):
        return '94' + digits[1:]
    if len(digits) == 9:
        return '94' + digits
    return digits


def _send_textlk(phone: str, message: str) -> tuple[bool, str]:
    url = 'https://app.text.lk/api/v3/sms/send'
    headers = {
        'Authorization': f'Bearer {API_TOKEN}',
        'Accept': 'application/json',
    }
    payload = {
        'recipient': phone,
        'sender_id': SENDER_ID,
        'type': 'plain',
        'message': message,
    }
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=10)
        return (res.status_code < 300, res.text[:500])
    except requests.RequestException as e:
        return (False, str(e))


def _send_smslk(phone: str, message: str) -> tuple[bool, str]:
    """SMSLK / Dialog-style HTTP gateway. Adjust endpoint to match the contract."""
    url = os.getenv('SMS_API_URL', 'https://api.sms.lk/sms/send')
    payload = {
        'api_token': API_TOKEN,
        'sender_id': SENDER_ID,
        'phone': phone,
        'message': message,
    }
    try:
        res = requests.post(url, data=payload, timeout=10)
        return (res.status_code < 300, res.text[:500])
    except requests.RequestException as e:
        return (False, str(e))


def _send_console(phone: str, message: str) -> tuple[bool, str]:
    logger.info('[SMS→%s] %s', phone, message)
    return (True, 'console')


_DISPATCH = {
    'textlk': _send_textlk,
    'smslk': _send_smslk,
    'console': _send_console,
}


def send_sms(phone: str, message: str, event: str = '') -> NotificationLog:
    """Send an SMS and log it. Returns the NotificationLog row."""
    normalized = _normalize_phone(phone)
    log = NotificationLog.objects.create(
        channel='sms',
        recipient=normalized or phone or '',
        event=event,
        message=message,
        provider=PROVIDER,
        status='queued',
    )
    if not normalized:
        log.status = 'failed'
        log.provider_response = 'invalid phone'
        log.save(update_fields=['status', 'provider_response'])
        return log

    sender = _DISPATCH.get(PROVIDER, _send_console)
    ok, response = sender(normalized, message)
    log.status = 'sent' if ok else 'failed'
    log.provider_response = response
    log.save(update_fields=['status', 'provider_response'])
    return log
