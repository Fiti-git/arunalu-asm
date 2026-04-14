import os
from django.http import FileResponse, HttpResponse
from django.shortcuts import render
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


def _restore_response(result, tmp_path):
    """
    Interpret a pg_restore subprocess result and return a DRF Response.

    pg_restore exits non-zero even for harmless warnings produced by
    --clean (e.g. DROP on a missing object).  We only treat lines that
    start with 'pg_restore: error:' as real failures.
    """
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
@permission_classes([AllowAny])
def download_db_backup(request):
    if not request.user.groups.filter(name__in=["Manager", "Admin"]).exists() and not request.user.is_staff:
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
    if not request.user.groups.filter(name__in=["Manager", "Admin"]).exists() and not request.user.is_staff:
        return HttpResponse("Permission denied", status=403)

    uploaded = request.FILES.get('backup')
    if not uploaded:
        return Response({"error": "No file provided. Send file as 'backup' field."}, status=400)

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
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return Response({"error": str(e)}, status=500)


# ---------------------------------------------------------------------------
# No-auth backup / restore  (internal HTML tool at /db-backup/)
# ---------------------------------------------------------------------------

def db_backup_page(request):
    return render(request, 'db_backup.html')


@api_view(['GET'])
@permission_classes([AllowAny])
def noauth_download_db_backup(request):
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
@permission_classes([AllowAny])
def noauth_upload_db_backup(request):
    uploaded = request.FILES.get('backup')
    if not uploaded:
        return Response({"error": "No file provided. Send file as 'backup' field."}, status=400)

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
    except Exception as e:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return Response({"error": str(e)}, status=500)
