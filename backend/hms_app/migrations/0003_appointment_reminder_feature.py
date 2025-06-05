from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hms_app', '0002_labtest_instructions_labtest_test_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='notification_status',
            field=models.CharField(
                choices=[('PENDING', 'Pending'), ('SENT', 'Sent')],
                default='PENDING',
                max_length=10,
                help_text='Status of the appointment notification'
            ),
        ),
    ] 