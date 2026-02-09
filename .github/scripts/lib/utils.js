#!/usr/bin/env node

function buildCustomInstructions(lines) {
  return lines.filter(line => line !== '').join('\n');
}

function parseMarkers(prBody) {
  if (!prBody) {
    return { parentIssue: null, taskId: null, phase: null };
  }
  
  const parentMatch = prBody.match(/Agent-Parent-Issue:\s*(\d+)/);
  const taskMatch = prBody.match(/Agent-Task-Id:\s*(\S+)/);
  const phaseMatch = prBody.match(/Agent-Phase:\s*(\S+)/);
  const phase = phaseMatch ? phaseMatch[1].toLowerCase() : null;
  const inferredTaskId =
    taskMatch?.[1] ||
    (phase === 'requirement' || phase === 'spec' || phase === 'plan' ? phase : null);
  
  return {
    parentIssue: parentMatch ? parseInt(parentMatch[1]) : null,
    taskId: inferredTaskId,
    phase
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
