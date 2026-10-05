"""Command-line equivalent of the super administrator validation runner."""
import uuid
from django.core.management.base import BaseCommand, CommandError
from web.validation import now, root, save


class Command(BaseCommand):
    help = 'Run isolated system validation and save the results shown in the super administrator interface.'

    def handle(self, *args, **options):
        lock = root() / 'run.lock'
        try:
            with lock.open('x'):
                pass
        except FileExistsError:
            raise CommandError('A validation run is already active.')
        run_id = uuid.uuid4().hex
        save(root() / f'{run_id}.json', {'id': run_id, 'started_at': now(), 'status': 'running', 'tests': [], 'manual': {}, 'requested_by': None})
        from web.validation_worker import main
        main(run_id)
        self.stdout.write(f'Saved validation run {run_id}. Open /admin/evaluation to inspect the results.')
