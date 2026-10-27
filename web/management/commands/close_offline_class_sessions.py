from django.core.management.base import BaseCommand
from web.class_sessions import expire_offline_sessions


class Command(BaseCommand):
    help = 'Legacy compatibility command; teacher-led sessions require explicit ending.'

    def handle(self, *args, **options):
        expire_offline_sessions()
        self.stdout.write('No sessions closed. Offline presence does not end teacher-led classrooms; use the explicit End session action.')
