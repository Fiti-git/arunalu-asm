from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payroll", "0005_backfill_financial_profiles"),
    ]

    operations = [
        migrations.AddField(
            model_name="payrollcompanyconfig",
            name="last_epf_export_ym",
            field=models.CharField(blank=True, default="", max_length=6),
        ),
    ]
