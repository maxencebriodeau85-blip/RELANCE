"""Read-only backup attestation metadata. Tests inject a fixture-only API client."""
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone

WORKFLOW_PATH = '.github/workflows/backup.yml'
EXPECTED_BRANCH = 'main'
MAX_AGE = timedelta(hours=26)

class ProofUnavailable(Exception):
    """No trustworthy result can be inferred from the available API metadata."""

def timestamp(value):
    if not isinstance(value, str):
        raise ProofUnavailable('Invalid timestamp')
    try:
        result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, OverflowError) as error:
        raise ProofUnavailable('Invalid timestamp') from error
    if result.tzinfo is None:
        raise ProofUnavailable('Missing timezone')
    try:
        return result.astimezone(timezone.utc)
    except (ValueError, OverflowError) as error:
        raise ProofUnavailable('Invalid timezone conversion') from error

def positive_id(value):
    return type(value) is int and value > 0

def collection(payload, key):
    if not isinstance(payload, dict) or not isinstance(payload.get(key), list):
        raise ProofUnavailable('Incomplete API response')
    return payload[key]

def latest_verified_backup(api, repository, now):
    """Return a fresh attestation only with a matching encrypted archive and trusted run.

    At most 100 successful runs and 100 artifacts per eligible recent run are read.
    A truncated history may cause an alert, never an assumed successful backup.
    No artifact content is downloaded and no workflow is dispatched.
    """
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository):
        raise ProofUnavailable('Invalid repository')
    root = f'repos/{repository}'
    repo = api(root)
    workflow = api(f'{root}/actions/workflows/backup.yml')
    if (not isinstance(repo, dict) or not positive_id(repo.get('id'))
        or repo.get('full_name') != repository or repo.get('default_branch') != EXPECTED_BRANCH
        or not isinstance(workflow, dict) or not positive_id(workflow.get('id'))
        or workflow.get('path') != WORKFLOW_PATH):
        raise ProofUnavailable('Unexpected repository or workflow')
    runs = collection(api(f'{root}/actions/workflows/{workflow["id"]}/runs?branch=main&status=success&per_page=100'), 'workflow_runs')
    latest = None
    for run in runs[:100]:
        if not isinstance(run, dict):
            continue
        run_id, sha = run.get('id'), run.get('head_sha')
        if (not positive_id(run_id) or run.get('workflow_id') != workflow['id']
            or run.get('head_branch') != EXPECTED_BRANCH
            or run.get('status') != 'completed' or run.get('conclusion') != 'success'
            or run.get('event') not in ('schedule', 'workflow_dispatch')
            or not isinstance(sha, str) or not re.fullmatch(r'[0-9a-f]{40}', sha)
            or not isinstance(run.get('repository'), dict) or run['repository'].get('id') != repo['id']
            or not isinstance(run.get('head_repository'), dict) or run['head_repository'].get('id') != repo['id']):
            continue
        try:
            finished = timestamp(run.get('updated_at'))
        except ProofUnavailable:
            continue
        if finished > now or finished <= now - MAX_AGE:
            continue
        artifacts = collection(api(f'{root}/actions/runs/{run_id}/artifacts?per_page=100'), 'artifacts')
        accepted = {}
        for artifact in artifacts[:100]:
            if not isinstance(artifact, dict):
                continue
            name = artifact.get('name')
            if name not in (f'backup-verified-{run_id}', f'encair-backup-{run_id}'):
                continue
            link = artifact.get('workflow_run')
            if (artifact.get('expired') is not False or not positive_id(artifact.get('size_in_bytes'))
                or not isinstance(link, dict) or link.get('id') != run_id
                or link.get('repository_id') != repo['id'] or link.get('head_repository_id') != repo['id']
                or link.get('head_branch') != EXPECTED_BRANCH or link.get('head_sha') != sha):
                continue
            try:
                created = timestamp(artifact.get('created_at'))
                expires = timestamp(artifact.get('expires_at'))
            except ProofUnavailable:
                continue
            if now - MAX_AGE < created <= finished and expires > now:
                accepted[name] = created
        marker = accepted.get(f'backup-verified-{run_id}')
        archive = accepted.get(f'encair-backup-{run_id}')
        if marker is not None and archive is not None and archive <= marker:
            latest = marker if latest is None else max(latest, marker)
    return latest

def github_api(endpoint):
    try:
        result = subprocess.run(['gh', 'api', '--method', 'GET', endpoint], check=True,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, timeout=20)
        return json.loads(result.stdout)
    except (subprocess.SubprocessError, OSError, ValueError) as error:
        raise ProofUnavailable('API unavailable') from error

def main():
    try:
        latest = latest_verified_backup(github_api, os.environ.get('GITHUB_REPOSITORY', ''), datetime.now(timezone.utc))
    except ProofUnavailable:
        # API/provider details never enter a public log or an issue.
        print('Preuve de sauvegarde indisponible ou non conforme.', file=sys.stderr)
        return 1
    if latest:
        print(latest.strftime('%Y-%m-%dT%H:%M:%SZ'))
    return 0

if __name__ == '__main__':
    sys.exit(main())
