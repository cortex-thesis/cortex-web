from unittest import skipUnless
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.db import IntegrityError, OperationalError, connections, transaction
from django.test import SimpleTestCase, TransactionTestCase, override_settings

from web.models import (
    CalibrationProfile, CurriculumPackage, EEGConnection, EEGDevice, EEGEpoch,
    EEGFeature, EEGRawChunk, EEGRecording, ModelVersion, School,
    SessionEEGSample, StatePrediction,
)
from .engine import (SyncError, changed_count, install_guards, merge, replicated_models,
                     snapshot, sync_once, write_changes)
from .ids import allocate, install_allocators
from .models import IdAllocation, ReplicaState


class MergeTests(SimpleTestCase):
    def test_cloud_fingerprints_fetch_only_changed_rows_and_detect_deletes(self):
        from .engine import cloud_snapshot, _cloud_snapshots
        _cloud_snapshots.clear()
        connection = MagicMock(vendor="postgresql")
        connection.ops.quote_name.side_effect = lambda name: '"' + name + '"'
        cursor = connection.cursor.return_value.__enter__.return_value
        cursor.fetchall.side_effect = [[(1, "a"), (2, "b")], [(1, "a"), (2, "b")], [(2, "c")]]
        model = MagicMock()
        model._meta.db_table = "test_table"
        model._meta.pk.attname = model._meta.pk.column = "id"
        query = model._base_manager.using.return_value.filter
        query.return_value.values.side_effect = [
            [{"id": 1, "name": "one"}, {"id": 2, "name": "two"}],
            [{"id": 2, "name": "edited"}],
        ]
        with patch("offline_sync.engine.connections", {"cloud": connection}), patch("offline_sync.engine.cloud_identity", return_value="test"):
            first = cloud_snapshot([model])
            first["test_table"]["1"]["name"] = "mutated externally"
            second = cloud_snapshot([model])
            self.assertEqual(second["test_table"]["1"]["name"], "one")
            self.assertEqual(query.call_count, 1)
            third = cloud_snapshot([model])
            self.assertEqual(third, {"test_table": {"2": {"id": 2, "name": "edited"}}})
            query.assert_called_with(pk__in=["2"])
        _cloud_snapshots.clear()

    def test_offline_create_update_delete_and_remote_changes(self):
        base = {"t": {"1": {"id": 1, "name": "old"}, "2": {"id": 2}}}
        local = {"t": {"1": {"id": 1, "name": "new"}, "3": {"id": 3}}}
        remote = {"t": {**base["t"], "4": {"id": 4}}}
        desired, conflicts = merge(base, local, remote)
        self.assertFalse(conflicts)
        self.assertEqual(set(desired["t"]), {"1", "3", "4"})
        self.assertEqual(desired["t"]["1"]["name"], "new")
        self.assertEqual(changed_count(base, local), 3)

    def test_retry_after_cloud_commit_is_idempotent(self):
        data = {"t": {"1": {"id": 1, "name": "new"}}}
        self.assertEqual(merge({}, data, data), (data, []))

    def test_independent_fields_merge_but_same_field_conflicts(self):
        base = {"t": {"1": {"a": 1, "b": 1}}}
        local = {"t": {"1": {"a": 2, "b": 1}}}
        remote = {"t": {"1": {"a": 1, "b": 2}}}
        self.assertEqual(merge(base, local, remote), ({"t": {"1": {"a": 2, "b": 2}}}, []))
        self.assertEqual(len(merge(base, local, {"t": {"1": {"a": 3, "b": 1}}})[1]), 1)

    def test_delete_versus_edit_and_numeric_collision_conflict(self):
        base = {"t": {"1": {"name": "old"}}}
        self.assertEqual(len(merge(base, {}, {"t": {"1": {"name": "new"}}})[1]), 1)
        self.assertEqual(len(merge({}, base, {"t": {"1": {"name": "new"}}})[1]), 1)


class LocalStorageTests(TransactionTestCase):
    def tearDown(self):
        from .engine import drop_guards
        drop_guards(replicated_models())
        for model in replicated_models():
            model._meta.pk.__dict__.pop("get_pk_value_on_save", None)
        super().tearDown()

    def test_reserved_ids_survive_higher_imported_ids_and_bulk_create(self):
        model = CurriculumPackage
        model.objects.create(id=900_000, slug="imported", name="Imported")
        install_guards({model._meta.db_table: [100_000, 199_999, 99_999]}, [model])
        install_allocators()
        # Avoid package signals for this allocator-focused test.
        rows = model.objects.bulk_create([
            model(slug="offline-a", name="A"), model(slug="offline-b", name="B"),
        ])
        self.assertEqual([r.pk for r in rows], [100_000, 100_001])
        connections["default"].close()
        self.assertEqual(allocate(model._meta.db_table), 100_002)
        with self.assertRaises(IntegrityError), transaction.atomic():
            model.objects.bulk_create([model(id=200_000, slug="invalid", name="Invalid")])

    def test_exhausted_range_cannot_create_colliding_record(self):
        IdAllocation.objects.create(table_name="example", next_id=11, end_id=10)
        with self.assertRaisesRegex(RuntimeError, "exhausted"):
            allocate("example")

    def test_raw_sync_preserves_timestamps_and_json_and_deletes(self):
        school = School.objects.create(name="Original")
        current = snapshot("default", [School])
        desired = snapshot("default", [School])
        desired[School._meta.db_table][str(school.pk)]["name"] = "Changed"
        with transaction.atomic():
            write_changes("default", current, desired, [School])
        school.refresh_from_db()
        self.assertEqual(school.name, "Changed")
        self.assertEqual(snapshot("default", [School]), desired)
        with transaction.atomic():
            write_changes("default", desired, {}, [School])
        self.assertFalse(School.objects.exists())

    def test_complete_eeg_pipeline_is_part_of_the_local_replica(self):
        """Keep every database-backed EEG artifact available without internet."""
        replicated_tables = {model._meta.db_table for model in replicated_models()}
        eeg_models = {
            EEGDevice, CalibrationProfile, EEGConnection, EEGRecording,
            EEGRawChunk, EEGEpoch, EEGFeature, ModelVersion,
            StatePrediction, SessionEEGSample,
        }
        self.assertTrue(
            {model._meta.db_table for model in eeg_models}.issubset(replicated_tables)
        )

    @override_settings(OFFLINE_SYNC_ENABLED=True)
    def test_api_blocks_until_bootstrap_and_status_never_exposes_snapshot(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 503)
        ReplicaState.objects.create(baseline={"secret": "password hash"})
        response = self.client.get("/api/sync/status/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("secret", response.content.decode())
        self.assertEqual(response["Cache-Control"], "no-store")


@skipUnless("cloud" in connections, "Use --settings=offline_sync.test_settings for dual-database tests")
class DualDatabaseTests(TransactionTestCase):
    databases = {"default", "cloud"} if "cloud" in connections else {"default"}

    def setUp(self):
        # Exercise real transactions/SQL on two isolated databases. PostgreSQL
        # locks and sequence reservation require PostgreSQL integration testing.
        self.locks = patch("offline_sync.engine.lock_cloud")
        self.ranges = patch("offline_sync.engine.reserve_ids", return_value={})
        self.locks.start()
        self.ranges.start()
        self.constraint = patch("offline_sync.engine.cloud_constraints_immediate")
        self.constraint.start()

    def tearDown(self):
        self.locks.stop()
        self.ranges.stop()
        self.constraint.stop()
        super().tearDown()

    def test_initialize_push_pull_delete_conflict_and_resolution(self):
        school = School.objects.using("cloud").create(name="Cloud school")
        sync_once(initialize=True)
        self.assertEqual(School.objects.get(pk=school.pk).name, "Cloud school")
        School.objects.filter(pk=school.pk).update(name="Offline edit")
        sync_once()
        self.assertEqual(School.objects.using("cloud").get(pk=school.pk).name, "Offline edit")
        School.objects.using("cloud").filter(pk=school.pk).update(address="Cloud address")
        sync_once()
        self.assertEqual(School.objects.get(pk=school.pk).address, "Cloud address")
        School.objects.filter(pk=school.pk).update(name="Laptop A")
        School.objects.using("cloud").filter(pk=school.pk).update(name="Laptop B")
        self.assertEqual(sync_once().status, "conflict")
        self.assertEqual(School.objects.get(pk=school.pk).name, "Laptop A")
        call_command("sync_cortex", resolve=["web_school", str(school.pk)], take="local")
        sync_once()
        self.assertEqual(School.objects.using("cloud").get(pk=school.pk).name, "Laptop A")
        School.objects.filter(pk=school.pk).delete()
        sync_once()
        self.assertFalse(School.objects.using("cloud").filter(pk=school.pk).exists())

    def test_cloud_failure_does_not_advance_local_checkpoint(self):
        school = School.objects.using("cloud").create(name="Original")
        sync_once(initialize=True)
        baseline = ReplicaState.objects.get(pk=1).baseline
        School.objects.filter(pk=school.pk).update(name="Pending")
        with patch("offline_sync.engine.write_changes", side_effect=IntegrityError("failure")):
            with self.assertRaises(IntegrityError):
                sync_once()
        self.assertEqual(ReplicaState.objects.get(pk=1).baseline, baseline)
        self.assertEqual(School.objects.get(pk=school.pk).name, "Pending")
        self.assertEqual(School.objects.using("cloud").get(pk=school.pk).name, "Original")
        sync_once()
        self.assertEqual(School.objects.using("cloud").get(pk=school.pk).name, "Pending")

    def test_initialization_refuses_existing_work(self):
        get_user_model().objects.create(username="existing")
        with self.assertRaisesRegex(SyncError, "fresh"):
            sync_once(initialize=True)

    def test_initialize_replaces_fresh_content_types_with_different_cloud_ids(self):
        local = ContentType.objects.create(app_label="sync_fixture", model="first")
        remote = ContentType.objects.using("cloud").create(id=local.pk + 1000, app_label="sync_fixture", model="first")
        sync_once(initialize=True)
        self.assertEqual(ContentType.objects.get(app_label="sync_fixture", model="first").pk, remote.pk)

    def test_initialize_refuses_edited_seed_curriculum(self):
        CurriculumPackage.objects.create(slug="care", name="Local work")
        with self.assertRaisesRegex(SyncError, "curriculum"):
            sync_once(initialize=True)

    def test_cloud_commit_failure_rolls_back_local_checkpoint(self):
        school = School.objects.using("cloud").create(name="Original")
        sync_once(initialize=True)
        baseline = ReplicaState.objects.get(pk=1).baseline
        School.objects.filter(pk=school.pk).update(name="Pending")
        with patch.object(connections["cloud"], "commit", side_effect=OperationalError("lost connection")):
            with self.assertRaises(OperationalError):
                sync_once()
        self.assertEqual(ReplicaState.objects.get(pk=1).baseline, baseline)
        self.assertEqual(School.objects.get(pk=school.pk).name, "Pending")
        self.assertEqual(School.objects.using("cloud").get(pk=school.pk).name, "Original")

    def test_retry_after_local_commit_failure_recognizes_cloud_write(self):
        school = School.objects.using("cloud").create(name="Original")
        sync_once(initialize=True)
        baseline = ReplicaState.objects.get(pk=1).baseline
        School.objects.filter(pk=school.pk).update(name="Pending")
        with patch.object(connections["default"], "commit", side_effect=OperationalError("disk full")):
            with self.assertRaises(OperationalError):
                sync_once()
        self.assertEqual(ReplicaState.objects.get(pk=1).baseline, baseline)
        self.assertEqual(School.objects.using("cloud").get(pk=school.pk).name, "Pending")
        sync_once()
        self.assertEqual(ReplicaState.objects.get(pk=1).status, "online")
