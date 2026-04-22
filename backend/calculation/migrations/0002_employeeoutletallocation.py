from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0015_attendancelockperiod'),
        ('calculation', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmployeeOutletAllocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('percentage', models.DecimalField(decimal_places=2, max_digits=5)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='outlet_allocations',
                    to='main.employee',
                )),
                ('outlet', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='main.outlet',
                )),
            ],
            options={
                'unique_together': {('employee', 'outlet')},
            },
        ),
    ]
