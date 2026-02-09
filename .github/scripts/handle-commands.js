#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const command = process.env.COMMAND;
    const actor = process.env.ACTOR;
    const commentBody = process.env.COMMENT_BODY;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    if (!token || !issueNumber || !command || !actor || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const issue = await github.getIssue(issueNumber);
    
    const issueType = identifyIssueType(issue.labels);
    
    if (issueType === 'epic') {
      core.info('Command issued on Epic Issue - no forwarding needed');
      core.setOutput('forward_needed', 'false');
      core.setOutput('target_issue', issueNumber.toString());
      return;
    }
    
    if (issueType === 'phase' || issueType === 'task') {
      const epicIssue = await findEpicIssue(github, issue);
      
      if (!epicIssue) {
        core.setFailed(`Could not find Epic Issue for ${issueType} issue #${issueNumber}`);
        return;
      }
      
      // Concurrency check: Verify Epic Issue is accessible before forwarding
      try {
        await github.getIssue(epicIssue);
        core.info(`Epic Issue #${epicIssue} is accessible - proceeding with command forwarding`);
      } catch (error) {
        core.setFailed([
          `❌ Concurrency Error: Unable to access Epic Issue #${epicIssue}.`,
          `It may be locked by another operation. Please try again.`,
          ``,
          `Error details: ${error.message}`
        ].join('\n'));
        return;
      }
      
      await github.createComment(issueNumber, [
        `🔄 **Command Forwarded**`,
        ``,
        `Your command \`${command}\` has been forwarded to Epic Issue #${epicIssue}.`,
        ``,
        `_Commands should be issued on the Epic Issue for proper handling._`
      ].join('\n'));
      
      await github.createComment(epicIssue, [
        `📨 **Forwarded Command from ${issueType.charAt(0).toUpperCase() + issueType.slice(1)} Issue #${issueNumber}**`,
        ``,
        `User @${actor} issued: \`${command}\``,
        ``,
        commentBody || ''
      ].join('\n'));
      
      core.info(`Command forwarded from ${issueType} #${issueNumber} to Epic #${epicIssue}`);
      core.setOutput('forward_needed', 'true');
      core.setOutput('target_issue', epicIssue.toString());
      return;
    }
    
    core.setFailed(`Unknown issue type for #${issueNumber}`);
  } catch (error) {
    core.setFailed(`Failed to handle command: ${error.message}`);
    process.exit(1);
  }
}

function identifyIssueType(labels) {
  const labelNames = labels.map(l => l.name);
  
  if (labelNames.some(l => l.startsWith('agent:phase:'))) {
    return 'phase';
  }
  
  if (labelNames.includes('agent:task')) {
    return 'task';
  }
  
  if (labelNames.includes('agent:requested')) {
    return 'epic';
  }
  
  return 'unknown';
}

async function findEpicIssue(github, issue) {
  const labels = issue.labels.map(l => l.name);
  
  const parentLabel = labels.find(l => l.startsWith('agent:parent:'));
  if (parentLabel) {
    const epicNumber = parseInt(parentLabel.split(':')[2]);
    if (!isNaN(epicNumber)) {
      return epicNumber;
    }
  }
  
  const bodyMatch = issue.body?.match(/Agent-Parent-Issue:\s*(\d+)/);
  if (bodyMatch) {
    return parseInt(bodyMatch[1]);
  }
  
  return null;
}

main();
