#!/usr/bin/env node

const core = require('@actions/core');
const { parseMarkers } = require('./lib/utils');

async function main() {
  try {
    const prNumber = parseInt(process.env.PR_NUMBER);
    const prBody = process.env.PR_BODY || '';
    const headRef = process.env.HEAD_REF || '';
    const author = process.env.PR_AUTHOR || '';
    
    if (!prNumber) {
      core.setFailed('Missing PR_NUMBER environment variable');
      return;
    }

    let prType = 'unknown';
    const markers = parseMarkers(prBody);
    
    if (markers.taskId === 'spec') {
      prType = 'spec';
    } else if (markers.taskId === 'plan') {
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
    core.info(`PR Type: ${prType}, Parent: ${markers.parentIssue}, Task: ${markers.taskId}`);
    
    console.log(JSON.stringify({ prType, parentIssue: markers.parentIssue, taskId: markers.taskId }));
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
