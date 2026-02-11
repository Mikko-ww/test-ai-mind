#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const prNumber = parseInt(process.env.PR_NUMBER);
    const headSha = process.env.HEAD_SHA;
    const headRef = process.env.HEAD_REF;
    const parentIssue = process.env.PARENT_ISSUE || '';
    const taskKey = process.env.TASK_KEY || '';
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const ref = process.env.GITHUB_REF || 'refs/heads/main';

    if (!token || !prNumber || !headSha || !headRef || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);

    await github.createWorkflowDispatch(
      'agent-ci.yml',
      ref.replace('refs/heads/', ''),
      {
        pr_number: prNumber.toString(),
        head_sha: headSha,
        head_ref: headRef
      }
    );

    core.info(`✓ Triggered CI for PR #${prNumber}`);

    if (parentIssue && taskKey) {
      await github.createWorkflowDispatch(
        'agent-merge-policy.yml',
        ref.replace('refs/heads/', ''),
        {
          pr_number: prNumber.toString(),
          parent_issue: parentIssue,
          task_key: taskKey
        }
      );

      core.info(`✓ Triggered merge policy evaluation for PR #${prNumber}`);
    }
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
