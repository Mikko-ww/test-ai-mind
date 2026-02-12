#!/usr/bin/env node

/**
 * This script migrates state comments from an old version to the current version.
 * It reads the latest state comment, updates the version field, and posts a new comment.
 * 
 * Usage: GITHUB_TOKEN=xxx ISSUE_NUMBER=59 node migrate-state-version.js
 */

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { STATE_VERSION, parseStateFromComment, createStateComment } = require('./lib/state-manager');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    if (!token || !issueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables: GITHUB_TOKEN, ISSUE_NUMBER, GITHUB_REPOSITORY');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();
    const stateMarker = config.state.marker;

    // Get all comments
    const comments = await github.listComments(issueNumber);
    
    // Find all state comments
    const stateComments = comments
      .filter(c => c.body && c.body.includes(stateMarker))
      .map(c => {
        const state = parseStateFromComment(c.body, stateMarker);
        return state ? { comment: c, state } : null;
      })
      .filter(s => s !== null);

    if (stateComments.length === 0) {
      core.info('No state comments found');
      return;
    }

    // Sort by version to get the latest
    stateComments.sort((a, b) => b.state.version - a.state.version);
    const latestStateComment = stateComments[0];

    core.info(`Found latest state with version: ${latestStateComment.state.version}`);
    core.info(`Current STATE_VERSION in code: ${STATE_VERSION}`);

    if (latestStateComment.state.version === STATE_VERSION) {
      core.info('✓ State version is already up to date');
      return;
    }

    // Create new state with updated version
    const migratedState = {
      ...latestStateComment.state,
      version: STATE_VERSION,
      updated_at: new Date().toISOString()
    };

    core.info(`Migrating state from version ${latestStateComment.state.version} to ${STATE_VERSION}`);

    // Post new state comment
    await createStateComment(github, issueNumber, migratedState, stateMarker);

    core.info(`✓ State version migrated successfully from ${latestStateComment.state.version} to ${STATE_VERSION}`);
    
  } catch (error) {
    core.setFailed(`Migration failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
