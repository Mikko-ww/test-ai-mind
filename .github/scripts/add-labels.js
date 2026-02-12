#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

async function main() {
  try {
    core.info('=== add-labels.js starting ===');
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const labels = process.env.LABELS ? process.env.LABELS.split(',').map(l => l.trim()) : [];
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    core.info(`Input parameters: owner=${owner}, repo=${repo}, issueNumber=${issueNumber}, labels=${labels.join(', ')}`);

    if (!token || !issueNumber || !owner || !repo || labels.length === 0) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client...');
    const github = new GitHubClient(token, owner, repo);

    core.info(`Adding labels to issue #${issueNumber}...`);
    await github.addLabels(issueNumber, labels);

    core.info(`✓ Added labels: ${labels.join(', ')}`);
    core.info('=== add-labels.js completed successfully ===');
  } catch (error) {
    core.error(`=== add-labels.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
