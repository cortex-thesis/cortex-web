from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("web", "0002_content_repository")]

    operations = [
        migrations.RenameIndex(
            model_name="auditlog",
            new_name="web_auditlo_object__1c8d60_idx",
            old_name="web_auditlo_object__6c6e3e_idx",
        ),
    ]
