"""Read-only connection probe; never prints connection strings or passwords."""
import os
import sys
import socket
from urllib.parse import urlsplit
from urllib.request import urlopen
from urllib.error import HTTPError
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cortex.settings")
import django
django.setup()
from django.db import connections
from django.conf import settings
import psycopg


def network_probe():
    """Distinguish blocked TCP from PostgreSQL authentication failures."""
    connection = connections["cloud" if "cloud" in connections else "default"]
    host = connection.settings_dict["HOST"]
    for port in (5432, 6543):
        try:
            with socket.create_connection((host, port), timeout=5):
                print(f"TCP {port}: reachable", flush=True)
        except OSError as error:
            print(f"TCP {port}: {type(error).__name__}", flush=True)
    endpoint = settings.SUPABASE_STORAGE_ENDPOINT
    if endpoint:
        parsed = urlsplit(endpoint)
        try:
            with urlopen(f"https://{parsed.hostname}/auth/v1/health", timeout=10) as response:
                print(f"Project HTTPS: reachable (HTTP {response.status})", flush=True)
        except HTTPError as error:
            print(f"Project HTTPS: reachable (HTTP {error.code})", flush=True)
        except OSError as error:
            print(f"Project HTTPS: {type(error).__name__}", flush=True)


def probe(port):
    connection = connections["cloud" if "cloud" in connections else "default"]
    params = connection.get_connection_params()
    params.update(port=port, connect_timeout=10)
    try:
        with psycopg.connect(**params) as db:
            with db.cursor() as cursor:
                cursor.execute("SELECT 1")
                assert cursor.fetchone() == (1,)
        return f"Port {port}: authenticated SELECT 1 succeeded"
    except Exception as error:
        return f"Port {port}: {type(error).__name__} (SQLSTATE {getattr(error, 'sqlstate', None) or 'unavailable'})"


if __name__ == "__main__":
    if "--network" in sys.argv:
        network_probe()
    with ThreadPoolExecutor(max_workers=2) as executor:
        for result in executor.map(probe, (5432, 6543)):
            print(result)
