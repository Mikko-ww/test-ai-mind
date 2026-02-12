#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

async function main() {
  try {
    core.info('=== create-check-run.js starting ===');
    const token = process.env.GITHUB_TOKEN;
    const headSha = process.env.HEAD_SHA;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    core.info(`Input parameters: owner=${owner}, repo=${repo}, headSha=${headSha}`);

    if (!token || !headSha || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client...');
    const github = new GitHubClient(token, owner, repo);

    core.info('Creating check run for agent/ci...');
    const check = await github.createCheckRun('agent/ci', headSha, 'in_progress');

    core.setOutput('check_run_id', check.data.id);
    core.info(`✓ Check run created: ${check.data.id}`);
    core.info('=== create-check-run.js completed successfully ===');
  } catch (error) {
    core.error(`=== create-check-run.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
