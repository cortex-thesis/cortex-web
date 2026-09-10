"""PostgreSQL backend that retries transient Supabase session-pool rejections."""
import time

from django.db.backends.postgresql.base import DatabaseWrapper as PostgreSQLDatabaseWrapper


class DatabaseWrapper(PostgreSQLDatabaseWrapper):
    """Retry only Supabase's immediate max-session rejection.

    The development configuration closes connections after every request. A
    short retry additionally prevents a request from failing during the small
    interval between another request finishing and its pool slot being freed.
    """

    def get_new_connection(self, conn_params):
        delays = (0, 0.2, 0.5, 1.0)
        for attempt, delay in enumerate(delays):
            if delay:
                time.sleep(delay)
            try:
                return super().get_new_connection(conn_params)
            except self.Database.OperationalError as error:
                pool_full = "EMAXCONNSESSION" in str(error) or "max clients reached in session mode" in str(error)
                if not pool_full or attempt == len(delays) - 1:
                    raise

