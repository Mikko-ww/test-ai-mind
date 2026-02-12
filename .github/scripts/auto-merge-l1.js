#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');

async function main() {
  try {
    core.info('=== auto-merge-l1.js starting ===');
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const prNumber = parseInt(process.env.PR_NUMBER);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    core.info(`Input parameters: owner=${owner}, repo=${repo}, prNumber=${prNumber}`);

    if (!token || !prNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client and loading config...');
    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    try {
      core.info(`Attempting to merge PR #${prNumber} with squash method...`);
      await github.mergePR(prNumber, 'squash');
      core.info('✓ PR auto-merged (L1)');
      core.info('=== auto-merge-l1.js completed successfully ===');
    } catch (error) {
      if (error.status === 405 && error.message.includes('auto-merge')) {
        core.warning('Auto-merge not available, downgrading to L2');

        core.info('Removing L1 label and adding L2 label...');
        await github.removeLabel(prNumber, 'agent:l1');
        await github.addLabels(prNumber, ['agent:l2']);

        core.info('Creating downgrade comment...');
        await github.createComment(prNumber, [
          '⚠️ Auto-merge Downgrade',
          '',
          'This PR was classified as L1 but auto-merge is not available (repository settings or branch protection).',
          '',
          'Downgraded to L2: Please use `/approve-task` command to merge.'
        ].join('\n'));
        core.info('=== auto-merge-l1.js completed with downgrade ===');
      } else {
        core.warning(`Auto-merge failed: ${error.message}`);
        throw error;
      }
    }
  } catch (error) {
    core.error(`=== auto-merge-l1.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
