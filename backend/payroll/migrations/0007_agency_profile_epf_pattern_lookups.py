from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0006_last_epf_export_ym"),
        ("main", "0015_attendancelockperiod"),
    ]

    operations = [
        migrations.CreateModel(
            name="EpfZone",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=5, unique=True)),
                ("name", models.CharField(blank=True, default="", max_length=80)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.CreateModel(
            name="Bank",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=10, unique=True)),
                ("name", models.CharField(max_length=120)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="BankBranch",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=10)),
                ("name", models.CharField(max_length=120)),
                ("is_active", models.BooleanField(default=True)),
                ("bank", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="branches", to="payroll.bank")),
            ],
            options={"ordering": ["bank__name", "name"], "unique_together": {("bank", "code")}},
        ),
        migrations.CreateModel(
            name="AgencyPayrollProfile",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("company_name", models.CharField(blank=True, default="", max_length=200)),
                ("employer_epf_number", models.CharField(blank=True, default="", max_length=20)),
                ("employer_etf_number", models.CharField(blank=True, default="", max_length=20)),
                ("epf_zone_code", models.CharField(blank=True, default="", max_length=5)),
                ("data_submission_number", models.PositiveIntegerField(default=1)),
                ("last_epf_export_ym", models.CharField(blank=True, default="", max_length=6)),
                ("company_bank_name", models.CharField(blank=True, default="", max_length=100)),
                ("company_bank_code", models.CharField(blank=True, default="", max_length=10)),
                ("company_bank_branch_code", models.CharField(blank=True, default="", max_length=10)),
                ("company_bank_account_no", models.CharField(blank=True, default="", max_length=30)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("agency", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="payroll_profile", to="main.agency")),
            ],
            options={"ordering": ["agency__name"]},
        ),
        migrations.CreateModel(
            name="OutletEpfPattern",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("prefix", models.CharField(blank=True, default="", max_length=20)),
                ("suffix", models.CharField(blank=True, default="", max_length=20)),
                ("padding", models.PositiveSmallIntegerField(default=4)),
                ("next_seq", models.PositiveIntegerField(default=1)),
                ("is_active", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("outlet", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="epf_pattern", to="main.outlet")),
            ],
            options={"ordering": ["outlet__name"]},
        ),
    ]
