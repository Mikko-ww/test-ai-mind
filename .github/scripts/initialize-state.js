#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

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
    const stateMarker = '<!-- agent-state:json -->';

    const initialState = {
      state_id: `agent-state:${owner}/${repo}:${issueNumber}`,
      version: 16,
      parent_issue: issueNumber,
      current_phase: 'requirement',
      phases: {
        requirement: {
          status: 'pending',
          issue_number: null,
          pr_number: null,
          retry_count: 0,
          started_at: null,
          completed_at: null
        },
        spec: {
          status: 'pending',
          issue_number: null,
          pr_number: null,
          retry_count: 0,
          started_at: null,
          completed_at: null
        },
        plan: {
          status: 'pending',
          issue_number: null,
          pr_number: null,
          retry_count: 0,
          started_at: null,
          completed_at: null
        },
        execution: {
          status: 'pending',
          issue_number: null,
          pr_number: null,
          retry_count: 0,
          started_at: null,
          completed_at: null
        }
      },
      plan_path: null,
      cursor_task_id: null,
      tasks: {},
      paused: false,
      phase: 'requirement-in-progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Create state comment
    const stateComment = [
      stateMarker,
      '```json',
      JSON.stringify(initialState, null, 2),
      '```',
      '',
      'Agent State Initialized',
      '',
      'This comment tracks the execution state of the autonomous agent. Do not edit manually.'
    ].join('\n');

    await github.createComment(issueNumber, stateComment);

    core.info(`✓ State initialized for issue #${issueNumber}`);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
