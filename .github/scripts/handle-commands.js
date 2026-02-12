#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { tryParseAgentMetadata } = require('./lib/marker-parser');

async function main() {
  try {
    core.info('=== handle-commands.js starting ===');
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const command = process.env.COMMAND;
    const actor = process.env.ACTOR;
    const commentBody = process.env.COMMENT_BODY;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    core.info(`Input parameters: owner=${owner}, repo=${repo}, issueNumber=${issueNumber}, command=${command}, actor=${actor}`);

    if (!token || !issueNumber || !command || !actor || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client...');
    const github = new GitHubClient(token, owner, repo);
    
    core.info(`Fetching issue #${issueNumber}...`);
    const issue = await github.getIssue(issueNumber);
    
    core.info('Identifying issue type...');
    const issueType = identifyIssueType(issue);
    core.info(`Issue type: ${issueType}`);
    
    if (issueType === 'epic') {
      core.info('Command issued on Epic Issue - no forwarding needed');
      core.setOutput('forward_needed', 'false');
      core.setOutput('target_issue', issueNumber.toString());
      core.info('=== handle-commands.js completed successfully ===');
      return;
    }
    
    if (issueType === 'phase' || issueType === 'task') {
      core.info(`Finding Epic Issue for ${issueType} issue #${issueNumber}...`);
      const epicIssue = await findEpicIssue(github, issue);
      
      if (!epicIssue) {
        core.setFailed(`Could not find Epic Issue for ${issueType} issue #${issueNumber}`);
        return;
      }
      
      core.info(`Found Epic Issue #${epicIssue}, verifying accessibility...`);
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
      
      core.info('Forwarding command to Epic Issue...');
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
      core.info('=== handle-commands.js completed successfully ===');
      return;
    }
    
    core.setFailed(`Unknown issue type for #${issueNumber}`);
  } catch (error) {
    core.error(`=== handle-commands.js failed: ${error.message} ===`);
    core.setFailed(`Failed to handle command: ${error.message}`);
    process.exit(1);
  }
}

function identifyIssueType(issue) {
  const parsed = tryParseAgentMetadata(issue.body || '', 'issue');
  if (parsed.ok) {
    if (parsed.metadata.issueType === 'phase') {
      return 'phase';
    }
    if (parsed.metadata.issueType === 'task') {
      return 'task';
    }
  }

  const labelNames = issue.labels.map((label) => label.name);
  if (labelNames.includes('agent:requested')) {
    return 'epic';
  }

  return 'unknown';
}

async function findEpicIssue(github, issue) {
  const parsed = tryParseAgentMetadata(issue.body || '', 'issue');
  if (parsed.ok && parsed.metadata.parentIssue) {
    return parsed.metadata.parentIssue;
  }

  return null;
}

main();
