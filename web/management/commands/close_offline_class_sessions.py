from django.core.management.base import BaseCommand
from web.class_sessions import expire_offline_sessions


class Command(BaseCommand):
    help = 'Close teacher-led sessions with expired teacher presence and save reports.'

    def handle(self, *args, **options):
        self.stdout.write(f'Closed {expire_offline_sessions()} offline class sessions.')
