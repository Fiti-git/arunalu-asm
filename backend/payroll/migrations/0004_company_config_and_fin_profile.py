from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payroll', '0003_payroll_audit_log'),
        ('main', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PayrollCompanyConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('company_name', models.CharField(blank=True, default='', max_length=200)),
                ('employer_epf_number', models.CharField(blank=True, default='', max_length=20)),
                ('employer_etf_number', models.CharField(blank=True, default='', max_length=20)),
                ('epf_zone_code', models.CharField(blank=True, default='A', max_length=5)),
                ('data_submission_number', models.PositiveIntegerField(default=1)),
                ('company_bank_name', models.CharField(blank=True, default='', max_length=100)),
                ('company_bank_code', models.CharField(blank=True, default='', max_length=10)),
                ('company_bank_branch_code', models.CharField(blank=True, default='', max_length=10)),
                ('company_bank_account_no', models.CharField(blank=True, default='', max_length=30)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Payroll Company Config',
                'verbose_name_plural': 'Payroll Company Config',
            },
        ),
        migrations.CreateModel(
            name='EmployeeFinancialProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('surname', models.CharField(blank=True, default='', max_length=100)),
                ('initials', models.CharField(blank=True, default='', max_length=30)),
                ('epf_member_status', models.CharField(
                    choices=[('E', 'Existing'), ('N', 'New')],
                    default='E', max_length=1,
                )),
                ('etf_member_no', models.CharField(blank=True, default='', max_length=20)),
                ('bank_name', models.CharField(blank=True, default='', max_length=100)),
                ('bank_code', models.CharField(blank=True, default='', max_length=10)),
                ('bank_branch_code', models.CharField(blank=True, default='', max_length=10)),
                ('bank_account_no', models.CharField(blank=True, default='', max_length=30)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('employee', models.OneToOneField(
                    on_delete=models.deletion.CASCADE,
                    related_name='financial_profile',
                    to='main.employee',
                )),
            ],
        ),
    ]
