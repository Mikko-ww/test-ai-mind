#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.PARENT_ISSUE);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const ref = process.env.GITHUB_REF || 'refs/heads/main';

    if (!token || !issueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    await github.removeLabel(issueNumber, config.labels.parent.plan_in_progress);
    await github.addLabels(issueNumber, [
      config.labels.parent.plan_approved,
      config.labels.parent.executing
    ]);

    await github.createComment(issueNumber, [
      '✅ Plan Approved',
      '',
      'The execution plan has been merged. Creating task sub-issues...',
      '',
      'Status: `executing`'
    ].join('\n'));

    await github.createWorkflowDispatch(
      'agent-task-creator.yml',
      ref.replace('refs/heads/', ''),
      { parent_issue: issueNumber.toString() }
    );

    core.info('✓ Plan merge handled, triggered task creation');
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
