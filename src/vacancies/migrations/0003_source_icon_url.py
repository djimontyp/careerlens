from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("vacancies", "0002_vacancy_location")]

    operations = [
        migrations.AddField(
            model_name="source",
            name="icon_url",
            field=models.CharField(blank=True, max_length=1000, null=True),
        ),
    ]
