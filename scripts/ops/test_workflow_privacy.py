"""Offline security contract for production workflows. Requires PyYAML 6.0.3.

Run with: python3 scripts/ops/test_workflow_privacy.py
No workflow, shell step, database connection or provider action is executed.
Pass --ref <commit-sha> to audit a historical committed source revision.
"""
from pathlib import Path
import argparse
import json
import re
import subprocess
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[2]
FILES = ('.github/workflows/backup.yml', '.github/workflows/monitor.yml')
GATE = 'gate'
GATED = "needs.gate.outputs.private == 'true'"
SENSITIVE_SECRETS = ('PROD_DB_URL', 'BACKUP_PASSPHRASE', 'CRON_SECRET')
PARSER = argparse.ArgumentParser()
PARSER.add_argument('--ref')
OPTIONS, UNITTEST_ARGS = PARSER.parse_known_args()
if OPTIONS.ref and not re.fullmatch(r'[0-9a-fA-F]{7,40}', OPTIONS.ref):
    PARSER.error('--ref must be a commit SHA')


def read_text(path):
    if OPTIONS.ref:
        return subprocess.check_output(['git', 'show', f'{OPTIONS.ref}:{path}'], cwd=ROOT, text=True)
    return (ROOT / path).read_text()


def read_workflow(path):
    # BaseLoader preserves the GitHub YAML key `on` instead of YAML 1.1's boolean.
    return yaml.load(read_text(path), Loader=yaml.BaseLoader)


def run_scripts(job):
    return '\n'.join(step.get('run', '') for step in job.get('steps', []))


class ProductionWorkflowPrivacy(unittest.TestCase):
    def test_gate_job_fails_loudly_on_public_repository(self):
        for path in FILES:
            jobs = read_workflow(path)['jobs']
            with self.subTest(workflow=path):
                self.assertIn(GATE, jobs)
                gate = jobs[GATE]
                self.assertNotIn('needs', gate, 'The gate must run first')
                self.assertNotIn('if', gate, 'The gate must never be skipped')
                self.assertEqual(gate.get('permissions'), {'contents': 'read'})
                self.assertEqual(gate['outputs'].get('private'),
                                 '${{ steps.visibility.outputs.private }}')
                steps = gate['steps']
                self.assertEqual(len(steps), 1)
                self.assertEqual(steps[0].get('id'), 'visibility')
                self.assertEqual(steps[0].get('env'), {'GH_TOKEN': '${{ github.token }}'})
                script = steps[0]['run']
                self.assertIn('gh api "repos/$GITHUB_REPOSITORY" --jq .private', script)
                self.assertIn('if [ "$private" != "true" ]; then', script)
                self.assertRegex(script, r'::error::[^\n]*\n\s*exit 1',
                                 'A public repository must fail the run, not skip it')
                self.assertNotIn('secrets.', yaml.dump(gate))

    def test_every_production_job_requires_the_gate(self):
        for path in FILES:
            jobs = read_workflow(path)['jobs']
            for job_name, job in jobs.items():
                if job_name == GATE:
                    continue
                with self.subTest(workflow=path, job=job_name):
                    self.assertEqual(job.get('needs'), GATE)
                    self.assertEqual(job.get('if'), GATED,
                        'Privacy must gate the whole job, not a later shell step')

    def test_event_payload_guard_is_gone(self):
        for path in FILES:
            with self.subTest(workflow=path):
                self.assertNotIn('github.event.repository', read_text(path))

    def test_production_workflows_do_not_run_on_code_or_pr_events(self):
        for path in FILES:
            workflow = read_workflow(path)
            with self.subTest(workflow=path):
                self.assertEqual(set(workflow['on']), {'schedule', 'workflow_dispatch'})

    def test_sensitive_configuration_is_only_loaded_by_the_steps_that_need_it(self):
        for path in FILES:
            workflow = read_workflow(path)
            with self.subTest(workflow=path):
                self.assertNotIn('env', workflow)
                self.assertNotIn('defaults', workflow)
                self.assertEqual(workflow.get('permissions'), {})
                for job_name, job in workflow['jobs'].items():
                    self.assertTrue(job.get('steps'))
                    self.assertNotIn('uses', job,
                        'A reusable production job needs its own privacy review')
                    self.assertNotIn('secrets.', yaml.dump(job.get('env', {})),
                        f'{job_name}: secrets belong in step env only')
                    for step in job['steps']:
                        env = step.get('env', {})
                        for name in SENSITIVE_SECRETS:
                            if name in env:
                                self.assertIn(f'${name}', step.get('run', ''),
                                    f'{job_name}: {name} loaded by a step that does not use it')

    def test_actions_are_pinned_to_commit_sha(self):
        for path in FILES:
            for line in read_text(path).splitlines():
                if re.match(r'\s*(-\s+)?uses:', line):
                    with self.subTest(workflow=path, line=line.strip()):
                        self.assertRegex(line, r'uses: [\w.-]+/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$')

    def test_supabase_cli_matches_package_lock_and_postgres_17(self):
        lock = json.loads(read_text('package-lock.json'))
        expected = lock['packages']['node_modules/supabase']['version']
        backup = read_workflow('.github/workflows/backup.yml')['jobs']['backup']
        cli = [s for s in backup['steps'] if s.get('uses', '').startswith('supabase/setup-cli@')]
        self.assertEqual(len(cli), 1)
        self.assertEqual(cli[0]['with']['version'], expected)
        self.assertRegex(read_text('supabase/config.toml'), r'(?m)^major_version = 17$')

    def test_restore_runs_in_an_empty_postgres_17_stack(self):
        backup = read_workflow('.github/workflows/backup.yml')['jobs']['backup']
        start = next(s['run'] for s in backup['steps'] if 'supabase start' in s.get('run', ''))
        self.assertIn('mkdir -p "$RUNNER_TEMP/stack" && cd "$RUNNER_TEMP/stack"', start)
        self.assertLess(start.index('cd "$RUNNER_TEMP/stack"'), start.index('supabase init'))
        self.assertLess(start.index('major_version = 17'), start.index('supabase start'))
        restore = next(s['run'] for s in backup['steps'] if s.get('name') == 'Restaurer la sauvegarde')
        self.assertIn('restore/history_schema.sql', restore)
        self.assertIn('restore/history_data.sql', restore)

    def test_backup_secrets_and_counts_stay_out_of_logs(self):
        backup = read_workflow('.github/workflows/backup.yml')['jobs']['backup']
        scripts = run_scripts(backup)
        self.assertNotIn('cat dump/counts.txt', scripts)
        self.assertNotIn('diff -u', scripts)
        self.assertNotRegex(scripts, r'--passphrase\s+"', 'Passphrase must not be an argv value')
        self.assertEqual(scripts.count('--passphrase-fd 3'), scripts.count('3<<<"$BACKUP_PASSPHRASE"'))
        self.assertIn('"${#BACKUP_PASSPHRASE}" -lt 32', scripts)
        names = [s.get('with', {}).get('name', '') for s in backup['steps']]
        self.assertIn('backup-verified-${{ github.run_id }}', names)

    def test_monitor_checks_backup_freshness_and_hides_db_errors(self):
        check = read_workflow('.github/workflows/monitor.yml')['jobs']['check']
        self.assertEqual(check['permissions'].get('actions'), 'read')
        scripts = run_scripts(check)
        self.assertNotIn('db-error.txt', scripts)
        self.assertNotIn('|| echo 000', scripts)
        self.assertIn('startswith("backup-verified-")', scripts)
        self.assertIn('/api/cron/status', scripts)
        self.assertIn('automationReady', check['env']['EXPECTED_CONFIG'])


if __name__ == '__main__':
    unittest.main(argv=['test_workflow_privacy.py', *UNITTEST_ARGS])
