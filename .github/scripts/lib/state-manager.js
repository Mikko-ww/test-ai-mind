#!/usr/bin/env node

const core = require('@actions/core');
const { PHASES, initializePhases } = require('./phase-manager');

const STATE_VERSION = 18;

async function getLatestState(github, issueNumber, stateMarker) {
  try {
    const comments = await github.listComments(issueNumber);
    
    const stateComments = comments
      .filter(c => c.body && c.body.includes(stateMarker))
      .map(c => {
        const state = parseStateFromComment(c.body, stateMarker);
        return state ? { state, commentId: c.id } : null;
      })
      .filter(item => item !== null);
    
    if (stateComments.length === 0) {
      return null;
    }
    
    // Sort by version (descending), then by comment ID (descending) to get the truly latest state
    // When multiple comments have the same version, the one with the higher comment ID is newer
    stateComments.sort((a, b) => {
      const versionDiff = b.state.version - a.state.version;
      if (versionDiff !== 0) {
        return versionDiff;
      }
      return b.commentId - a.commentId;
    });
    
    const latestState = stateComments[0].state;

    return assertStateVersion(latestState);
  } catch (error) {
    core.error(`Failed to get latest state: ${error.message}`);
    throw error;
  }
}

async function createStateComment(github, issueNumber, state, stateMarker) {
  try {
    const lines = [
      stateMarker,
      '```json',
      JSON.stringify(state, null, 2),
      '```',
      '',
      `Agent State Updated (version ${state.version})`,
      ''
    ];
    
    if (state.current_phase) {
      lines.push(`Current Phase: \`${state.current_phase}\``);
    }
    
    if (state.cursor_task_id) {
      lines.push(`Current Task: \`${state.cursor_task_id}\``);
    }
    
    lines.push('', '_This comment tracks execution state. Do not edit manually._');
    
    const body = lines.filter(line => line !== '').join('\n');
    return await github.createComment(issueNumber, body);
  } catch (error) {
    core.error(`Failed to create state comment: ${error.message}`);
    throw error;
  }
}

function parseStateFromComment(commentBody, stateMarker) {
  if (!commentBody || !commentBody.includes(stateMarker)) {
    return null;
  }
  
  try {
    const jsonMatch = commentBody.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
  } catch (error) {
    core.warning(`Failed to parse state from comment: ${error.message}`);
  }
  
  return null;
}

function assertStateVersion(state) {
  if (!state) {
    return null;
  }

  // STATE_VERSION is used for initializing new states
  // Existing states can have any positive version number as it's incremented on updates
  if (typeof state.version !== 'number' || state.version < 1) {
    throw new Error(
      `Invalid state version: ${state.version}. State version must be a positive number.`
    );
  }

  return state;
}

function createInitialState(issueNumber, owner, repo) {
  return {
    state_id: 'agent-state:' + owner + '/' + repo + ':' + issueNumber,
    version: STATE_VERSION,
    parent_issue: issueNumber,
    current_phase: PHASES.SPEC,
    phases: initializePhases(),
    plan_path: null,
    cursor_task_id: null,
    tasks: {},
    paused: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

class StateManager {
  constructor(github, issueNumber) {
    this.github = github;
    this.issueNumber = issueNumber;
    this.state = null;
    this.stateMarker = '<!-- agent-state:json -->';
  }

  async load() {
    this.state = await getLatestState(this.github, this.issueNumber, this.stateMarker);
    if (!this.state) {
      throw new Error(`No state found for issue #${this.issueNumber}`);
    }
    return this.state;
  }

  async save() {
    if (!this.state) {
      throw new Error('No state to save. Call load() first.');
    }
    this.state.updated_at = new Date().toISOString();
    await createStateComment(this.github, this.issueNumber, this.state, this.stateMarker);
  }
}

module.exports = {
  STATE_VERSION,
  getLatestState,
  createStateComment,
  parseStateFromComment,
  assertStateVersion,
  createInitialState,
  StateManager
};
