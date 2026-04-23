from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payroll', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='APITSlab',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('label', models.CharField(blank=True, default='', max_length=80)),
                ('min_monthly', models.DecimalField(decimal_places=2, max_digits=12)),
                ('max_monthly', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('rate_pct', models.DecimalField(decimal_places=2, max_digits=5)),
                ('deduct_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['min_monthly']},
        ),
        migrations.AddField(
            model_name='payroll',
            name='tax_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.AddField(
            model_name='payroll',
            name='tax_slab_label',
            field=models.CharField(blank=True, default='', max_length=80),
        ),
    ]
