"""Fixtures only: no subprocess, network, credentials, database or workflow run."""
import copy
from datetime import datetime, timezone
import unittest
from unittest.mock import patch
import contextlib
import io
import verified_backup
from verified_backup import latest_verified_backup, ProofUnavailable

NOW = datetime(2026, 10, 25, 7, 0, tzinfo=timezone.utc)
REPOSITORY = 'owner/encair'
ROOT = f'repos/{REPOSITORY}'
RUNS = f'{ROOT}/actions/workflows/10/runs?branch=main&status=success&per_page=100'
ARTIFACTS = f'{ROOT}/actions/runs/100/artifacts?per_page=100'
SHA = 'a' * 40

def fixtures():
    def artifact(name):
        return {'name': name, 'expired': False, 'size_in_bytes': 100,
            'created_at': '2026-10-25T06:20:00Z', 'expires_at': '2026-11-08T06:20:00Z',
            'workflow_run': {'id': 100, 'repository_id': 1, 'head_repository_id': 1,
                'head_branch': 'main', 'head_sha': SHA}}
    return {
        ROOT: {'id': 1, 'full_name': REPOSITORY, 'default_branch': 'main'},
        f'{ROOT}/actions/workflows/backup.yml': {'id': 10, 'path': '.github/workflows/backup.yml'},
        RUNS: {'workflow_runs': [{'id': 100, 'workflow_id': 10, 'head_branch': 'main',
            'head_sha': SHA, 'status': 'completed', 'conclusion': 'success', 'event': 'schedule',
            'repository': {'id': 1}, 'head_repository': {'id': 1}, 'updated_at': '2026-10-25T06:30:00Z'}]},
        ARTIFACTS: {'artifacts': [artifact('backup-verified-100'), artifact('encair-backup-100')]},
    }

class VerifiedBackup(unittest.TestCase):
    def result(self, data):
        calls = []
        def api(path):
            calls.append(path)
            self.assertIn(path, data, 'Unexpected API call')
            value = data[path]
            if isinstance(value, Exception):
                raise value
            return copy.deepcopy(value)
        result = latest_verified_backup(api, REPOSITORY, NOW)
        return result, calls

    def test_accepts_only_the_official_successful_run_and_its_paired_archive(self):
        result, calls = self.result(fixtures())
        self.assertEqual(result, datetime(2026, 10, 25, 6, 20, tzinfo=timezone.utc))
        self.assertEqual(len(calls), 4)
        self.assertFalse(any('/zip' in path or path.endswith('/dispatches') for path in calls))

    def test_rejects_wrong_workflow_branch_status_event_and_fork(self):
        for change in [
            {'workflow_id': 99}, {'head_branch': 'feature'}, {'status': 'in_progress'},
            {'conclusion': 'failure'}, {'event': 'pull_request'}, {'event': 'push'},
            {'repository': {'id': 2}}, {'head_repository': {'id': 2}},
            {'head_sha': None}, {'updated_at': None}, {'updated_at': '2026-10-26T06:30:00Z'},
        ]:
            with self.subTest(change=change):
                data = fixtures()
                data[RUNS]['workflow_runs'][0].update(change)
                result, calls = self.result(data)
                self.assertIsNone(result)
                self.assertNotIn(ARTIFACTS, calls)

    def test_rejects_missing_or_unexpected_official_workflow_metadata(self):
        for value in [{}, {'id': 10, 'path': '.github/workflows/other.yml'}, None]:
            data = fixtures()
            data[f'{ROOT}/actions/workflows/backup.yml'] = value
            with self.subTest(value=value), self.assertRaises(ProofUnavailable):
                self.result(data)

    def test_rejects_artifacts_from_another_run_or_commit_and_incomplete_objects(self):
        for change in [{'id': 101}, {'head_sha': 'b' * 40}, {'head_branch': 'feature'},
                       {'repository_id': 2}, {'head_repository_id': 2}]:
            data = fixtures()
            data[ARTIFACTS]['artifacts'][0]['workflow_run'].update(change)
            with self.subTest(change=change):
                self.assertIsNone(self.result(data)[0])
        for field in ['workflow_run', 'expired', 'created_at', 'expires_at', 'size_in_bytes']:
            data = fixtures()
            del data[ARTIFACTS]['artifacts'][0][field]
            with self.subTest(missing=field):
                self.assertIsNone(self.result(data)[0])

    def test_does_not_accept_an_arbitrary_prefix_expired_future_or_old_marker(self):
        for change in [
            {'name': 'backup-verified-fixture'}, {'expired': True}, {'expired': None},
            {'created_at': '2026-10-26T06:20:00Z'}, {'created_at': '2026-10-24T05:00:00Z'},
            {'created_at': '2026-10-25T06:20:00'}, {'expires_at': '2026-10-25T06:30:00Z'},
            {'size_in_bytes': 0},
        ]:
            data = fixtures()
            data[ARTIFACTS]['artifacts'][0].update(change)
            with self.subTest(change=change):
                self.assertIsNone(self.result(data)[0])

    def test_requires_an_available_encrypted_archive_from_the_same_run(self):
        for artifacts in [fixtures()[ARTIFACTS]['artifacts'][:1], []]:
            data = fixtures()
            data[ARTIFACTS]['artifacts'] = artifacts
            self.assertIsNone(self.result(data)[0])
        data = fixtures()
        data[ARTIFACTS]['artifacts'][1]['expired'] = True
        self.assertIsNone(self.result(data)[0])

    def test_api_errors_or_missing_collection_are_never_success(self):
        for value in [ProofUnavailable('simulated failure'), {}, {'artifacts': None}]:
            data = fixtures()
            data[ARTIFACTS] = value
            with self.subTest(value=value), self.assertRaises(ProofUnavailable):
                self.result(data)

    def test_manual_official_successful_run_is_accepted(self):
        data = fixtures()
        data[RUNS]['workflow_runs'][0]['event'] = 'workflow_dispatch'
        self.assertIsNotNone(self.result(data)[0])

    def test_selects_the_latest_valid_run_with_its_own_artifacts(self):
        data = fixtures()
        second = copy.deepcopy(data[RUNS]['workflow_runs'][0])
        second.update(id=200, updated_at='2026-10-25T06:55:00Z')
        data[RUNS]['workflow_runs'].append(second)
        second_artifacts = copy.deepcopy(data[ARTIFACTS])
        for artifact in second_artifacts['artifacts']:
            artifact['name'] = artifact['name'].replace('-100', '-200')
            artifact['workflow_run']['id'] = 200
            artifact['created_at'] = '2026-10-25T06:50:00Z'
        data[f'{ROOT}/actions/runs/200/artifacts?per_page=100'] = second_artifacts
        self.assertEqual(self.result(data)[0], datetime(2026, 10, 25, 6, 50, tzinfo=timezone.utc))

    def test_cli_failure_does_not_publish_provider_details(self):
        output = io.StringIO()
        with patch.object(verified_backup, 'latest_verified_backup', side_effect=ProofUnavailable('provider-sensitive-detail')):
            with contextlib.redirect_stderr(output):
                self.assertEqual(verified_backup.main(), 1)
        self.assertNotIn('provider-sensitive-detail', output.getvalue())

    def test_old_runs_cannot_refresh_backup_evidence(self):
        data = fixtures()
        data[RUNS]['workflow_runs'][0]['updated_at'] = '2026-10-24T05:00:00Z'
        result, calls = self.result(data)
        self.assertIsNone(result)
        self.assertNotIn(ARTIFACTS, calls)

if __name__ == '__main__':
    unittest.main()
