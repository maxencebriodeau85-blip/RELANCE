"""Offline security contract for production workflows. Requires PyYAML 6.0.3.

No workflow, shell step, database connection or provider action is executed.
Pass --ref <commit-sha> to audit a historical committed source revision.
"""
from pathlib import Path
import argparse
import re
import subprocess
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[2]
PRIVATE_ONLY = 'github.event.repository.private == true'
FILES = ('.github/workflows/backup.yml', '.github/workflows/monitor.yml')
PARSER = argparse.ArgumentParser()
PARSER.add_argument('--ref')
OPTIONS, UNITTEST_ARGS = PARSER.parse_known_args()
if OPTIONS.ref and not re.fullmatch(r'[0-9a-fA-F]{7,40}', OPTIONS.ref):
    PARSER.error('--ref must be a commit SHA')

def read_workflow(path):
    if OPTIONS.ref:
        text = subprocess.check_output(['git', 'show', f'{OPTIONS.ref}:{path}'], cwd=ROOT, text=True)
    else:
        text = (ROOT / path).read_text()
    # BaseLoader preserves the GitHub YAML key `on` instead of YAML 1.1's boolean.
    return yaml.load(text, Loader=yaml.BaseLoader)

class ProductionWorkflowPrivacy(unittest.TestCase):
    def test_every_production_job_requires_explicit_private_metadata(self):
        for path in FILES:
            workflow = read_workflow(path)
            self.assertTrue(workflow.get('jobs'), path)
            for job_name, job in workflow['jobs'].items():
                with self.subTest(workflow=path, job=job_name):
                    self.assertEqual(job.get('if'), PRIVATE_ONLY,
                        'Privacy must gate the whole job, not a later shell step')

    def test_production_workflows_do_not_run_on_code_or_pr_events(self):
        for path in FILES:
            workflow = read_workflow(path)
            with self.subTest(workflow=path):
                self.assertEqual(set(workflow['on']), {'schedule', 'workflow_dispatch'})

    def test_sensitive_configuration_is_not_loaded_at_workflow_scope(self):
        for path in FILES:
            workflow = read_workflow(path)
            with self.subTest(workflow=path):
                self.assertNotIn('env', workflow,
                    'Keep secret-bearing environment under the private-only job')
                self.assertNotIn('defaults', workflow)
                for job in workflow['jobs'].values():
                    self.assertTrue(job.get('steps'))
                    self.assertNotIn('uses', job,
                        'A reusable production job needs its own privacy review')

if __name__ == '__main__':
    unittest.main(argv=['test_workflow_privacy.py', *UNITTEST_ARGS])
