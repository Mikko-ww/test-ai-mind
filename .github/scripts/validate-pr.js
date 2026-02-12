#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

async function main() {
  try {
    core.info('=== validate-pr.js starting ===');
    const token = process.env.GITHUB_TOKEN;
    const prNumber = parseInt(process.env.PR_NUMBER);
    const headSha = process.env.HEAD_SHA;
    const headRef = process.env.HEAD_REF;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    core.info(`Input parameters: owner=${owner}, repo=${repo}, prNumber=${prNumber}, headSha=${headSha}, headRef=${headRef}`);

    if (!token || !prNumber || !headSha || !headRef || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client...');
    const github = new GitHubClient(token, owner, repo);

    core.info(`Fetching PR #${prNumber}...`);
    const pr = await github.getPR(prNumber);

    core.info(`Validating PR head SHA: expected=${headSha}, actual=${pr.head.sha}`);
    if (pr.head.sha !== headSha) {
      core.setFailed(`PR head SHA mismatch: expected ${headSha}, got ${pr.head.sha}`);
      return;
    }

    core.info(`Validating PR head ref: expected=${headRef}, actual=${pr.head.ref}`);
    if (pr.head.ref !== headRef) {
      core.setFailed(`PR head ref mismatch: expected ${headRef}, got ${pr.head.ref}`);
      return;
    }

    core.info(`✓ PR parameters validated: #${prNumber} @ ${headSha}`);
    core.setOutput('valid', 'true');
    core.info('=== validate-pr.js completed successfully ===');
  } catch (error) {
    core.error(`=== validate-pr.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
