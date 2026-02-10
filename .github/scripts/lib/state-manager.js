#!/usr/bin/env node

const core = require('@actions/core');
const { initializePhases } = require('./phase-manager');

const STATE_VERSION = 16;
const STATE_MARKER_CANONICAL = '<!-- agent-state:json -->';
const STATE_MARKER_LEGACY = '<!-- AGENT-STATE -->';
const STATE_MARKERS = [STATE_MARKER_CANONICAL, STATE_MARKER_LEGACY];

async function getLatestState(github, issueNumber, stateMarkers = STATE_MARKERS) {
  try {
    const comments = await github.listComments(issueNumber);
    const markers = Array.isArray(stateMarkers) ? stateMarkers : [stateMarkers];
    
    const stateComments = comments
      .filter(c => c.body && markers.some(marker => c.body.includes(marker)))
      .map(c => {
        const marker = markers.find(m => c.body.includes(m));
        return parseStateFromComment(c.body, marker || STATE_MARKER_CANONICAL);
      })
      .filter(s => s !== null);
    
    if (stateComments.length === 0) {
      return null;
    }
    
    stateComments.sort((a, b) => b.version - a.version);
    const latestState = stateComments[0];
    
    return migrateStateIfNeeded(latestState);
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
    
    if (state.phase) {
      lines.push(`Legacy Phase: \`${state.phase}\``);
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

function migrateStateIfNeeded(state) {
  if (!state) {
    return null;
  }
  
  if (state.version >= STATE_VERSION) {
    return state;
  }
  
  core.info(`Migrating state from version ${state.version} to ${STATE_VERSION}`);
  
  const migratedState = { ...state };
  
  if (!migratedState.phases) {
    migratedState.phases = initializePhases();
    
    if (migratedState.phase) {
      const legacyPhaseMap = {
        'spec-in-progress': 'requirement',
        'plan-in-progress': 'spec',
        'executing': 'execution'
      };
      
      migratedState.current_phase = legacyPhaseMap[migratedState.phase] || 'requirement';
    } else {
      migratedState.current_phase = 'requirement';
    }
  }
  
  if (!migratedState.current_phase) {
    migratedState.current_phase = 'requirement';
  }
  
  migratedState.version = STATE_VERSION;
  migratedState.updated_at = new Date().toISOString();
  
  return migratedState;
}

function createInitialState(issueNumber, owner, repo) {
  return {
    state_id: 'agent-state:' + owner + '/' + repo + ':' + issueNumber,
    version: STATE_VERSION,
    parent_issue: issueNumber,
    current_phase: 'requirement',
    phases: initializePhases(),
    plan_path: null,
    cursor_task_id: null,
    tasks: {},
    paused: false,
    phase: 'requirement-in-progress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

class StateManager {
  constructor(github, issueNumber) {
    this.github = github;
    this.issueNumber = issueNumber;
    this.state = null;
    this.stateMarker = STATE_MARKER_CANONICAL;
    this.stateMarkers = STATE_MARKERS;
  }

  async load() {
    this.state = await getLatestState(this.github, this.issueNumber, this.stateMarkers);
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
  migrateStateIfNeeded,
  createInitialState,
  StateManager
};
