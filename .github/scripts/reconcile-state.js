#!/usr/bin/env node

const core = require('@actions/core');
const fs = require('fs');
const yaml = require('js-yaml');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const ref = process.env.GITHUB_REF || 'refs/heads/main';

    if (!token || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    const issues = await github.octokit.paginate(github.octokit.rest.issues.listForRepo, {
      owner,
      repo,
      state: 'open',
      labels: config.labels.parent.executing,
      per_page: 100
    });

    let reconciledCount = 0;

    for (const issue of issues) {
      try {
        const planPath = `${config.paths.plan_yaml_dir}/issue-${issue.number}.yaml`;
        if (!fs.existsSync(planPath)) continue;

        const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));

        for (const task of plan.tasks) {
          if (task.status === 'in-progress' && task.pr) {
            const pr = await github.octokit.rest.pulls.get({
              owner,
              repo,
              pull_number: task.pr
            }).catch(() => ({ data: null }));

            if (pr.data && pr.data.merged) {
              await github.createComment(
                issue.number,
                `🔄 **Reconciliation**: Task ${task.id} PR #${task.pr} was merged but status not updated. Triggering dispatcher...`
              );

              await github.octokit.rest.actions.createWorkflowDispatch({
                owner,
                repo,
                workflow_id: 'agent-task-dispatcher.yml',
                ref,
                inputs: {
                  parent_issue: issue.number.toString(),
                  trigger: 'reconcile'
                }
              });

              reconciledCount++;
              core.info(`✓ Reconciled issue #${issue.number}, task ${task.id}`);
            }
          }
        }
      } catch (error) {
        core.warning(`Failed to reconcile issue #${issue.number}: ${error.message}`);
      }
    }

    core.info(`✓ Reconciliation complete: ${reconciledCount} tasks reconciled`);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
