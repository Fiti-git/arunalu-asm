from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0015_attendancelockperiod'),
    ]

    operations = [
        migrations.AddField(
            model_name='employeestatuslog',
            name='effective_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
