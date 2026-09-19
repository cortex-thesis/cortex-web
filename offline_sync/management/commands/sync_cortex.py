from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from offline_sync.engine import SyncError, snapshot
from offline_sync.models import ReplicaState
from offline_sync.worker import run_cycle, watch


class Command(BaseCommand):
    help = "Sync the local development database with Supabase. Run on each laptop."

    def add_arguments(self, parser):
        parser.add_argument("--initialize", action="store_true", help="Import cloud data into a fresh migrated local database.")
        parser.add_argument("--watch", action="store_true")
        parser.add_argument("--conflicts", action="store_true", help="List conflicting table names and record IDs only.")
        parser.add_argument("--resolve", nargs=2, metavar=("TABLE", "ID"))
        parser.add_argument("--take", choices=["local", "cloud"])

    def handle(self, *args, **options):
        try:
            if options["conflicts"]:
                state = ReplicaState.objects.filter(pk=1).first()
                for item in state.conflicts if state else []:
                    self.stdout.write(f"{item['table']} {item['key']}")
                return
            if options["resolve"]:
                if not options["take"]:
                    raise CommandError("--resolve requires --take local or --take cloud.")
                with transaction.atomic():
                    state = ReplicaState.objects.get(pk=1)
                    table, key = options["resolve"]
                    conflict = next((c for c in state.conflicts if c["table"] == table and c["key"] == key), None)
                    if conflict is None:
                        raise CommandError("Conflict not found.")
                    if snapshot("default").get(table, {}).get(key) != conflict["local"]:
                        raise CommandError("Local record changed since conflict detection. Run sync again before resolving.")
                    # Set the checkpoint to the other side's observed value. A
                    # subsequent cloud edit is still detected, never overwritten.
                    base = conflict["cloud"] if options["take"] == "local" else conflict["local"]
                    rows = state.baseline.setdefault(table, {})
                    if base is None:
                        rows.pop(key, None)
                    else:
                        rows[key] = base
                    state.conflicts.remove(conflict)
                    state.save()
                self.stdout.write("Resolution recorded. Run sync_cortex to apply it.")
                return
            if options["watch"] and not options["initialize"]:
                watch()
                return
            state = run_cycle(initialize=options["initialize"])
            self.stdout.write(f"Sync status: {state.status}")
            if options["watch"]:
                watch()
        except SyncError as error:
            raise CommandError(str(error)) from None
