from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from web.models import CurriculumPackage, Lesson, Profile


LESSONS = {
    "care": ["Morning self-care routine", "Healthy habits at home", "Keeping personal spaces tidy"],
    "life": ["Getting ready for school", "Packing my school bag", "Making a simple breakfast"],
    "pre_vocational": ["Using tools safely", "Following work instructions", "Organizing a workspace"],
    "livelihood": ["Growing a small garden", "Caring for plants", "Preparing items to sell"],
    "functional_academics": ["Reading a bus schedule", "Using money at a shop", "Following a daily timetable"],
    "career": ["Exploring jobs I enjoy", "Preparing for a workplace", "Practicing introductions"],
    "enrichment": ["Drawing what I learned", "Music and movement", "Creative problem solving"],
}

PACKAGE_NAMES = {
    "care": "Care", "life": "Life Skills", "pre_vocational": "Pre-Vocational",
    "livelihood": "Livelihood", "functional_academics": "Functional Academics",
    "career": "Career", "enrichment": "Enrichment",
}


class Command(BaseCommand):
    help = "Delete Cortex application data except users/profiles/schools, then seed seven packages and 21 lessons."

    def add_arguments(self, parser):
        parser.add_argument("--confirm", action="store_true")

    def handle(self, *args, **options):
        if not options["confirm"]:
            raise CommandError("This command is destructive. Re-run with --confirm.")
        admin = Profile.objects.filter(role=Profile.Role.ADMIN).order_by("pk").first()
        if admin is None:
            raise CommandError("An administrator profile is required to own the seeded lessons.")
        with transaction.atomic():
            table_names = connection.introspection.table_names()
            targets = sorted(name for name in table_names if name.startswith("web_") and name not in {"web_profile", "web_school"})
            if not targets or any(not name.startswith("web_") for name in targets):
                raise CommandError("Refusing to reset an unexpected table set.")
            quoted = ", ".join(connection.ops.quote_name(name) for name in targets)
            with connection.cursor() as cursor:
                cursor.execute(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE")
            for slug, titles in LESSONS.items():
                package = CurriculumPackage.objects.create(slug=slug, name=PACKAGE_NAMES[slug], is_active=True)
                Lesson.objects.bulk_create([
                    Lesson(package=package, title=title, description=f"A starter lesson for {PACKAGE_NAMES[slug]}.", status=Lesson.Status.APPROVED, created_by=admin)
                    for title in titles
                ])
        self.stdout.write(self.style.SUCCESS(
            f"Reset {len(targets)} application tables. Preserved users, profiles, and schools; seeded 7 packages and 21 lessons."
        ))
