#!/usr/bin/env python3
"""Create and verify a PostgreSQL custom-format backup without logging credentials."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone
from urllib.parse import urlparse, unquote

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path, help='Destination outside the repository; protect and encrypt the resulting file.')
args = parser.parse_args()
url = urlparse(os.environ.get('SUPABASE_DB_URL', ''))
if url.scheme not in ('postgres', 'postgresql') or not url.hostname or not url.password:
    parser.error('Provide SUPABASE_DB_URL through a secure environment, never as a command argument.')
output = args.output.resolve()
repo = Path(__file__).resolve().parents[1]
if output == repo or repo in output.parents:
    parser.error('Backups contain private data: choose a destination outside this repository.')
if output.exists():
    parser.error('Destination already exists; refusing to overwrite.')
env = dict(os.environ)
env.pop('SUPABASE_DB_URL', None)
env.update(PGHOST=url.hostname, PGPORT=str(url.port or 5432), PGUSER=unquote(url.username or 'postgres'), PGPASSWORD=unquote(url.password), PGDATABASE=url.path.lstrip('/') or 'postgres', PGSSLMODE='require', PGCONNECT_TIMEOUT='15')
os.umask(0o077)
output.parent.mkdir(parents=True, exist_ok=True)
try:
    # stderr can contain connection information; do not echo it automatically.
    subprocess.run(['pg_dump', '--format=custom', '--no-owner', '--no-acl', '--file', str(output)], env=env, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    subprocess.run(['pg_restore', '--list', str(output)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    digest = hashlib.sha256()
    with output.open('rb') as backup:
        for chunk in iter(lambda: backup.read(1024 * 1024), b''):
            digest.update(chunk)
    manifest = {'created_at': datetime.now(timezone.utc).isoformat(), 'sha256': digest.hexdigest(), 'bytes': output.stat().st_size, 'format': 'postgresql-custom', 'restore_tested': False, 'includes_storage_objects': False}
    output.with_suffix(output.suffix + '.manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Backup created and archive structure verified. A restoration test is still required.')
except (FileNotFoundError, subprocess.CalledProcessError):
    if output.exists():
        output.unlink()
    raise SystemExit('Backup failed. Check PostgreSQL client version (17+), connection and permissions. No success recorded.')
