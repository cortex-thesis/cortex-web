"""Compatibility node for the historical hosted live-EEG migration.

The hosted database records this migration as applied, but its schema changes
are already represented by the earlier live-session migrations in this tree.
Keeping the node restores a consistent migration graph without replaying or
removing hosted migration history.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("web", "0023_backfill_student_numbers")]
    operations = []
