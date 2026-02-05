#!/usr/bin/env node

function buildCustomInstructions(lines) {
  return lines.filter(line => line !== '').join('\n');
}

function parseMarkers(prBody) {
  if (!prBody) {
    return { parentIssue: null, taskId: null };
  }
  
  const parentMatch = prBody.match(/Agent-Parent-Issue:\s*(\d+)/);
  const taskMatch = prBody.match(/Agent-Task-Id:\s*(\S+)/);
  
  return {
    parentIssue: parentMatch ? parseInt(parentMatch[1]) : null,
    taskId: taskMatch ? taskMatch[1] : null
  };
}

function formatComment(lines) {
  return lines.filter(line => line !== '').join('\n');
}

module.exports = {
  buildCustomInstructions,
  parseMarkers,
  formatComment
};
