from django.db import migrations
from django.utils import timezone


def backfill_student_numbers(apps, schema_editor):
    Profile = apps.get_model("web", "Profile")
    students = Profile.objects.filter(role="student").order_by("school_id", "created_at", "pk")
    used_by_scope = {}
    for profile in students.exclude(student_number=""):
        year = profile.created_at.year if profile.created_at else timezone.now().year
        prefix = f"STU-{year}-"
        suffix = profile.student_number.rsplit("-", 1)[-1]
        if profile.student_number.startswith(prefix) and suffix.isdigit():
            used_by_scope.setdefault((profile.school_id, year), set()).add(int(suffix))
    for profile in students.filter(student_number=""):
        year = profile.created_at.year if profile.created_at else timezone.now().year
        used = used_by_scope.setdefault((profile.school_id, year), set())
        sequence = 1
        while sequence in used:
            sequence += 1
        profile.student_number = f"STU-{year}-{sequence:03d}"
        profile.save(update_fields=["student_number"])
        used.add(sequence)


class Migration(migrations.Migration):
    dependencies = [("web", "0022_practice_activity_evidence")]
    operations = [migrations.RunPython(backfill_student_numbers, migrations.RunPython.noop)]
