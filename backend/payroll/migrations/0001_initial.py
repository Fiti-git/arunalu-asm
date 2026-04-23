from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('main', '0015_attendancelockperiod'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AllowanceType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80, unique=True)),
                ('calc_mode', models.CharField(choices=[('FIXED', 'Fixed'), ('PERCENT', 'Percent of basic')], default='FIXED', max_length=10)),
                ('default_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('max_cap_amount', models.DecimalField(decimal_places=2, default=0, help_text='0 = no cap', max_digits=12)),
                ('is_active', models.BooleanField(default=True)),
                ('notes', models.CharField(blank=True, default='', max_length=255)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='AttendanceBonusTier',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('min_pct', models.DecimalField(decimal_places=2, max_digits=5)),
                ('max_pct', models.DecimalField(decimal_places=2, max_digits=5)),
                ('bonus_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('label', models.CharField(default='Attendance Bonus', max_length=80)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['-min_pct']},
        ),
        migrations.CreateModel(
            name='WorkSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mon_hours', models.DecimalField(decimal_places=2, default=8, max_digits=4)),
                ('tue_hours', models.DecimalField(decimal_places=2, default=8, max_digits=4)),
                ('wed_hours', models.DecimalField(decimal_places=2, default=8, max_digits=4)),
                ('thu_hours', models.DecimalField(decimal_places=2, default=8, max_digits=4)),
                ('fri_hours', models.DecimalField(decimal_places=2, default=8, max_digits=4)),
                ('sat_hours', models.DecimalField(decimal_places=2, default=6, max_digits=4)),
                ('sun_hours', models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ('ot_multiplier', models.DecimalField(decimal_places=2, default=1.5, max_digits=4)),
                ('holiday_multiplier', models.DecimalField(decimal_places=2, default=2.0, max_digits=4)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='work_schedule',
                    to='main.employee',
                )),
            ],
        ),
        migrations.CreateModel(
            name='Payroll',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('status', models.CharField(choices=[('Draft', 'Draft'), ('Locked', 'Locked')], default='Draft', max_length=16)),
                ('per_day_rate', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('per_hour_rate', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('ot_multiplier', models.DecimalField(decimal_places=2, default=1.5, max_digits=4)),
                ('holiday_multiplier', models.DecimalField(decimal_places=2, default=2.0, max_digits=4)),
                ('scheduled_hours', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('worked_hours', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('ot_hours', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('holiday_hours', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('holiday_ot_hours', models.DecimalField(decimal_places=2, default=0, max_digits=8)),
                ('days_present', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('days_late', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('days_half', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('days_absent', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('days_leave', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('days_holiday_worked', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('attendance_score', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('regular_pay', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('ot_pay', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('holiday_pay', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('leave_pay', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('allowance_total', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('deduction_total', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('gross_pay', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('basic_for_epf', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('epf_employee_pct', models.DecimalField(decimal_places=2, default=8, max_digits=5)),
                ('epf_company_pct', models.DecimalField(decimal_places=2, default=12, max_digits=5)),
                ('etf_company_pct', models.DecimalField(decimal_places=2, default=3, max_digits=5)),
                ('epf_employee_deduction', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('epf_company_contribution', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('etf_company_contribution', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('net_pay', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('daily_breakdown', models.JSONField(blank=True, default=list)),
                ('notes', models.TextField(blank=True, default='')),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('locked_at', models.DateTimeField(blank=True, null=True)),
                ('employee', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payrolls', to='main.employee',
                )),
                ('generated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='payrolls_generated', to=settings.AUTH_USER_MODEL,
                )),
                ('locked_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='payrolls_locked', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-period_end', '-generated_at'],
                'unique_together': {('employee', 'period_start', 'period_end')},
            },
        ),
        migrations.CreateModel(
            name='PayrollAllowance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(max_length=100)),
                ('amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('allowance_type', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.PROTECT,
                    to='payroll.allowancetype',
                )),
                ('payroll', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='allowances', to='payroll.payroll',
                )),
            ],
        ),
        migrations.CreateModel(
            name='PayrollDeduction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(max_length=100)),
                ('amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('payroll', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='deductions', to='payroll.payroll',
                )),
            ],
        ),
    ]
