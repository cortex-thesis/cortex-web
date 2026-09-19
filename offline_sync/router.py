class SyncRouter:
    def allow_migrate(self, db, app_label, **hints):
        if app_label == "offline_sync":
            return db == "default"
        return None
