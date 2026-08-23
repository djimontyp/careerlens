from typing import Any

from django.db import migrations

SOURCE_ICONS = {
    "rabota": "/source-icons/rabota.png",
    "work": "/source-icons/work.png",
    "dou": "/source-icons/dou.png",
    "djinni": "/source-icons/djinni.png",
    "remoteok": "/source-icons/remoteok.png",
    "remotive": "/source-icons/remotive.png",
    "wwr": "/source-icons/wwr.png",
    "jooble": "/source-icons/jooble.png",
    "jobsua": "/source-icons/jobsua.png",
}


def set_source_icons(apps: Any, schema_editor: Any) -> None:
    source_model = apps.get_model("vacancies", "Source")
    for code, icon_url in SOURCE_ICONS.items():
        source_model.objects.filter(code=code).update(icon_url=icon_url)


class Migration(migrations.Migration):
    dependencies = [("vacancies", "0003_source_icon_url")]

    operations = [migrations.RunPython(set_source_icons, migrations.RunPython.noop)]
