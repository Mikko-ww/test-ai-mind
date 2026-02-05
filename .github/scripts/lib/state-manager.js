#!/usr/bin/env node

const core = require('@actions/core');

async function getLatestState(github, issueNumber, stateMarker) {
  try {
    const comments = await github.listComments(issueNumber);
    
    const stateComments = comments
      .filter(c => c.body && c.body.includes(stateMarker))
      .map(c => parseStateFromComment(c.body, stateMarker))
      .filter(s => s !== null);
    
    if (stateComments.length === 0) {
      return null;
    }
    
    stateComments.sort((a, b) => b.version - a.version);
    return stateComments[0];
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
      '',
      `Phase: \`${state.phase}\``,
      state.cursor_task_id ? `Current Task: \`${state.cursor_task_id}\`` : '',
      '',
      '_This comment tracks execution state. Do not edit manually._'
    ].filter(line => line !== '');
    
    const body = lines.join('\n');
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

module.exports = {
  getLatestState,
  createStateComment,
  parseStateFromComment
};
