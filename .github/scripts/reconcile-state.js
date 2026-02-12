#!/usr/bin/env node

const core = require('@actions/core');
const fs = require('fs');
const yaml = require('js-yaml');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');

async function main() {
  try {
    core.info('=== reconcile-state.js starting ===');
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const ref = process.env.GITHUB_REF || 'refs/heads/main';

    core.info(`Input parameters: owner=${owner}, repo=${repo}`);

    if (!token || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client and loading config...');
    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    core.info('Fetching open issues with executing label...');
    const issues = await github.listIssues({
      state: 'open',
      labels: config.labels.parent.executing,
      perPage: 100
    });

    core.info(`Found ${issues.length} issues to reconcile`);
    let reconciledCount = 0;

    for (const issue of issues) {
      try {
        core.info(`Checking issue #${issue.number}...`);
        const planPath = `${config.paths.plan_yaml_dir}/issue-${issue.number}.yaml`;
        if (!fs.existsSync(planPath)) {
          core.info(`Plan file not found for issue #${issue.number}, skipping`);
          continue;
        }

        const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));

        for (const task of plan.tasks) {
          if (task.status === 'in-progress' && task.pr) {
            core.info(`Checking task ${task.id} PR #${task.pr}...`);
            const pr = await github.getPR(task.pr).catch(() => null);

            if (pr && pr.merged) {
              core.info(`Task ${task.id} PR #${task.pr} was merged but status not updated`);
              await github.createComment(
                issue.number,
                `🔄 **Reconciliation**: Task ${task.id} PR #${task.pr} was merged but status not updated. Triggering dispatcher...`
              );

              core.info('Triggering task dispatcher workflow...');
              await github.createWorkflowDispatch('agent-task-dispatcher.yml', ref, {
                parent_issue: issue.number.toString(),
                trigger: 'reconcile'
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
    core.info('=== reconcile-state.js completed successfully ===');
  } catch (error) {
    core.error(`=== reconcile-state.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
