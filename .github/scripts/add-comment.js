#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

async function main() {
  try {
    core.info('=== add-comment.js starting ===');
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const commentBody = process.env.COMMENT_BODY;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    core.info(`Input parameters: owner=${owner}, repo=${repo}, issueNumber=${issueNumber}`);

    if (!token || !issueNumber || !commentBody || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client...');
    const github = new GitHubClient(token, owner, repo);

    core.info(`Adding comment to issue #${issueNumber}...`);
    await github.createComment(issueNumber, commentBody);

    core.info(`✓ Added comment to issue #${issueNumber}`);
    core.info('=== add-comment.js completed successfully ===');
  } catch (error) {
    core.error(`=== add-comment.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
