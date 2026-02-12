#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');

async function main() {
  try {
    core.info('=== handle-approve-task.js starting ===');
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const prNumber = parseInt(process.env.PR_NUMBER);
    const approver = process.env.APPROVER;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    core.info(`Input parameters: owner=${owner}, repo=${repo}, prNumber=${prNumber}, approver=${approver}`);

    if (!token || !prNumber || !approver || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client and loading config...');
    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    core.info(`Fetching PR #${prNumber}...`);
    const pr = await github.getPR(prNumber);
    const labels = pr.labels.map(l => l.name);

    core.info(`PR labels: ${labels.join(', ')}`);
    if (!labels.includes(config.labels.level.l2)) {
      core.info('PR is not L2, rejecting approval');
      await github.createComment(
        prNumber,
        '❌ `/approve-task` can only be used on L2 task PRs.'
      );
      return;
    }

    core.info('Checking CI status...');
    const checkRuns = await github.listCheckRuns(pr.head.sha);

    const ciCheck = checkRuns.find(c => c.name === config.ci.required_check_name);
    if (!ciCheck || ciCheck.conclusion !== 'success') {
      core.info(`CI check not passed: ${ciCheck ? ciCheck.conclusion : 'not found'}`);
      await github.createComment(
        prNumber,
        '❌ Cannot approve: CI checks have not passed yet.'
      );
      return;
    }

    try {
      core.info('Attempting to merge PR...');
      await github.mergePR(prNumber, 'squash');

      core.info('Creating approval comment...');
      await github.createComment(
        prNumber,
        `✅ **Task Approved and Merged**\n\nApproved by @${approver}`
      );

      core.info(`✓ PR #${prNumber} approved and merged`);
      core.info('=== handle-approve-task.js completed successfully ===');
    } catch (error) {
      core.info(`Merge failed: ${error.message}`);
      await github.createComment(
        prNumber,
        `❌ **Merge Failed**\n\n${error.message}`
      );
      throw error;
    }
  } catch (error) {
    core.error(`=== handle-approve-task.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
