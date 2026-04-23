import os
from django.http import FileResponse, HttpResponse
from django.shortcuts import render, redirect
from django.db import connections
from django.db.utils import OperationalError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
import subprocess
from datetime import datetime


def attendance_page(request):
    return render(request, 'attendance.html')


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _get_db_env():
    """Return db connection params and a PGPASSWORD-enriched env dict."""
    db_name     = os.environ.get("DATABASE_NAME",     "aas_db")
    db_user     = os.environ.get("DATABASE_USER",     "aas_user")
    db_password = os.environ.get("DATABASE_PASSWORD", "")
    db_host     = os.environ.get("DATABASE_HOST",     "db")
    db_port     = str(os.environ.get("DATABASE_PORT", "5432"))
    env = os.environ.copy()
    env["PGPASSWORD"] = db_password
    return db_name, db_user, db_password, db_host, db_port, env


def _user_can_backup(user):
    """Admin / Manager group, staff, or superuser may run backup/restore."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or user.is_staff:
        return True
    return user.groups.filter(name__in=["Manager", "Admin"]).exists()


def _restore_response(result, tmp_path):
    """Interpret a pg_restore subprocess result and return a DRF Response."""
    real_errors = [
        line for line in result.stderr.splitlines()
        if "pg_restore: error:" in line.lower()
    ]

    if real_errors:
        return Response({
            "status": "error",
            "message": "Restore failed with errors",
            "details": "\n".join(real_errors[-50:]),
        }, status=500)

    if result.returncode != 0:
        # Non-zero exit with no hard errors = normal --clean warnings
        return Response({
            "status": "warning",
            "message": "Restore completed successfully (with minor warnings)",
            "details": result.stderr[-2000:],
        }, status=207)

    return Response({"status": "ok", "message": "Database restored successfully"})


# ---------------------------------------------------------------------------
# DB health
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
def db_health_check(request):
    try:
        connections['default'].cursor()
        return Response({"status": "ok", "database": "connected"})
    except OperationalError as e:
        return Response({
            "status": "error",
            "database": "not connected",
            "message": str(e),
        }, status=500)


# ---------------------------------------------------------------------------
# Auth-protected backup / restore  (Manager / Admin / staff)
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_db_backup(request):
    if not _user_can_backup(request.user):
        return HttpResponse("Permission denied", status=403)

    timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"/tmp/aas_backup_{timestamp}.dump"
    db_name, db_user, _, db_host, db_port, env = _get_db_env()

    command = [
        "pg_dump",
        "-h", db_host, "-U", db_user, "-p", db_port,
        "-F", "c", "-b", "-v",
        "-f", backup_file,
        db_name,
    ]

    try:
        subprocess.run(command, env=env, check=True)
        return FileResponse(
            open(backup_file, 'rb'),
            as_attachment=True,
            filename=os.path.basename(backup_file),
        )
    except subprocess.CalledProcessError as e:
        return HttpResponse(f"Error during backup: {e}", status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_db_backup(request):
    if not _user_can_backup(request.user):
        return HttpResponse("Permission denied", status=403)

    uploaded = request.FILES.get('backup')
    if not uploaded:
        return Response({"error": "No file provided. Send file as 'backup' field."}, status=400)

    # Cap restore uploads at 2 GiB to avoid disk exhaustion
    if uploaded.size > 2 * 1024 * 1024 * 1024:
        return Response({"error": "Backup file too large (>2GiB)."}, status=413)

    tmp_path = f"/tmp/uploaded_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.dump"
    with open(tmp_path, 'wb') as f:
        for chunk in uploaded.chunks():
            f.write(chunk)

    db_name, db_user, _, db_host, db_port, env = _get_db_env()

    command = [
        "pg_restore",
        "-h", db_host, "-U", db_user, "-p", db_port,
        "-d", db_name,
        "--clean", "--if-exists", "--no-owner", "--no-privileges", "-v",
        tmp_path,
    ]

    try:
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        os.remove(tmp_path)
        return _restore_response(result, tmp_path)
    except (OSError, subprocess.SubprocessError) as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return Response({"error": str(e)}, status=500)


# ---------------------------------------------------------------------------
# HTML backup page (now auth-gated)
# ---------------------------------------------------------------------------

def db_backup_page(request):
    if not request.user.is_authenticated:
        return redirect('/login/')
    if not _user_can_backup(request.user):
        return HttpResponse("Permission denied", status=403)
    return render(request, 'db_backup.html')


# ---------------------------------------------------------------------------
# Legacy no-auth endpoints — now require authentication.
# Kept as thin wrappers so any bookmarked URLs still work (with auth).
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def noauth_download_db_backup(request):
    return download_db_backup(request)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def noauth_upload_db_backup(request):
    return upload_db_backup(request)
