#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

/**
 * Reopen Issue Script
 * 
 * This script reopens a closed issue if necessary.
 * Used when PR merge auto-closes the parent issue, but we need to continue operations.
 * 
 * Environment Variables:
 * - AGENT_GH_TOKEN: GitHub token with issues write permission
 * - ISSUE_NUMBER: Issue number to check and reopen
 * - GITHUB_REPOSITORY: Repository in format "owner/repo"
 */

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    if (!token || !issueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);

    // Get current issue state
    const issue = await github.getIssue(issueNumber);

    if (issue.state === 'closed') {
      core.info(`Issue #${issueNumber} is closed. Reopening...`);
      
      // Reopen the issue
      await github.updateIssue(issueNumber, {
        state: 'open'
      });

      // Add a comment explaining why it was reopened
      await github.createComment(issueNumber, [
        '🔄 **Issue Reopened**',
        '',
        'This issue was automatically closed when the PR was merged, but the workflow is not complete yet.',
        'The issue will remain open until all stages (Requirement → Spec → Plan → Execution) are finished.',
        '',
        '_This is an automated action by the GitHub Agent system._'
      ].join('\n'));

      core.info(`✓ Issue #${issueNumber} reopened successfully`);
    } else {
      core.info(`Issue #${issueNumber} is already open. No action needed.`);
    }

  } catch (error) {
    core.setFailed(`Failed to reopen issue: ${error.message}`);
    process.exit(1);
  }
}

main();
