from __future__ import annotations

import uuid
from collections.abc import Iterable, Mapping

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

from .eeg_storage import EEGStorage


SCHEMA = pa.schema([
    ("recording_id", pa.string()),
    ("sample_index", pa.int64()),
    ("channel", pa.string()),
    ("value", pa.float64()),
])


class EEGDataStore:
    def __init__(self, storage: EEGStorage | None = None):
        self.storage = storage or EEGStorage()

    def write(self, recording_id, rows: Iterable[Mapping], *, overwrite: bool = False) -> str:
        recording_id = str(uuid.UUID(str(recording_id)))
        key = self.storage.processed_key(recording_id)
        normalized = [{
            "recording_id": recording_id,
            "sample_index": int(row["sample_index"]),
            "channel": str(row["channel"]),
            "value": float(row["value"]),
        } for row in rows]
        temporary = self.storage.temporary_path(key)
        try:
            pq.write_table(pa.Table.from_pylist(normalized, schema=SCHEMA), temporary)
            self.storage.atomic_commit(temporary, key, overwrite=overwrite)
        finally:
            temporary.unlink(missing_ok=True)
        return key

    def read(self, recording_id) -> list[dict]:
        path = self.storage.resolve(self.storage.processed_key(recording_id))
        return pq.read_table(path).to_pylist()

    def query(self, recording_id, sql: str = "SELECT channel, avg(value) AS mean_value FROM signal GROUP BY channel ORDER BY channel") -> list[dict]:
        path = self.storage.resolve(self.storage.processed_key(recording_id))
        connection = duckdb.connect(":memory:")
        try:
            connection.read_parquet(str(path)).create_view("signal")
            cursor = connection.execute(sql)
            columns = [item[0] for item in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
        finally:
            connection.close()
