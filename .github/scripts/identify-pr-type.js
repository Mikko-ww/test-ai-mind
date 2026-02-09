#!/usr/bin/env node

const core = require('@actions/core');
const { parseMarkers } = require('./lib/utils');

async function main() {
  try {
    const prNumber = parseInt(process.env.PR_NUMBER);
    const prBody = process.env.PR_BODY || '';
    const headRef = process.env.HEAD_REF || process.env.PR_HEAD_REF || '';
    const author = process.env.PR_AUTHOR || '';
    
    if (!prNumber) {
      core.setFailed('Missing PR_NUMBER environment variable');
      return;
    }

    let prType = 'unknown';
    const markers = parseMarkers(prBody);
    
    const markerType = markers.taskId || markers.phase;

    if (headRef.startsWith('agent/plan-status/')) {
      prType = 'status';
    } else if (markerType === 'requirement') {
      prType = 'requirement';
    } else if (markerType === 'spec') {
      prType = 'spec';
    } else if (markerType === 'plan') {
      prType = 'plan';
    } else if (headRef.startsWith('copilot/')) {
      const { loadConfig } = require('./lib/config-loader');
      const config = loadConfig();
      const allowlist = config.copilot?.bot_login_allowlist || [];
      if (allowlist.includes(author)) {
        prType = 'task';
      }
    }
    
    core.setOutput('pr_type', prType);
    core.setOutput('parent_issue', markers.parentIssue || '');
    core.setOutput('task_id', markers.taskId || '');
    core.setOutput('phase', markers.phase || '');
    core.info(`PR Type: ${prType}, Parent: ${markers.parentIssue}, Task: ${markers.taskId}, Phase: ${markers.phase}, HeadRef: ${headRef}`);
    
    console.log(JSON.stringify({ prType, parentIssue: markers.parentIssue, taskId: markers.taskId, phase: markers.phase, headRef }));
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
