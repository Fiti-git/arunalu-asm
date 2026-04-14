import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = "Seed a superadmin account. Uses env vars SEED_ADMIN_USERNAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD or safe defaults."

    def add_arguments(self, parser):
        parser.add_argument("--username", default=None, help="Superadmin username")
        parser.add_argument("--email",    default=None, help="Superadmin email")
        parser.add_argument("--password", default=None, help="Superadmin password")

    def handle(self, *args, **options):
        username = (
            options["username"]
            or os.environ.get("SEED_ADMIN_USERNAME", "admin")
        )
        email = (
            options["email"]
            or os.environ.get("SEED_ADMIN_EMAIL", "admin@arunalu.local")
        )
        password = (
            options["password"]
            or os.environ.get("SEED_ADMIN_PASSWORD", "Admin@1234")
        )

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f"Superadmin '{username}' already exists — skipping.")
            )
            return

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Superadmin created  →  username: {username}  |  email: {email}"
            )
        )
