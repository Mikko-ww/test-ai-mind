#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

async function main() {
  try {
    core.info('=== initialize-state.js starting ===');
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    core.info(`Input parameters: owner=${owner}, repo=${repo}, issueNumber=${issueNumber}`);

    if (!token || !issueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client...');
    const github = new GitHubClient(token, owner, repo);
    const stateMarker = '<!-- agent-state:json -->';

    core.info('Building initial state object...');
    const initialState = {
      state_id: `agent-state:${owner}/${repo}:${issueNumber}`,
      version: 17,
      parent_issue: issueNumber,
      current_phase: 'spec',
      phases: {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    core.info('Creating state comment...');
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
    core.info('=== initialize-state.js completed successfully ===');
  } catch (error) {
    core.error(`=== initialize-state.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
