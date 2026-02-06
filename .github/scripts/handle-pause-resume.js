#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const command = process.env.COMMAND;
    const actor = process.env.ACTOR;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const ref = process.env.GITHUB_REF || 'refs/heads/main';

    if (!token || !issueNumber || !command || !actor || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    if (command === 'pause') {
      await github.addLabels(issueNumber, [config.labels.parent.paused]);

      await github.createComment(
        issueNumber,
        `⏸️ **Agent Paused**\n\nTask dispatch paused by @${actor}.\n\nUse \`/resume\` to continue.`
      );

      core.info(`✓ Agent paused for issue #${issueNumber}`);
    } else if (command === 'resume') {
      try {
        await github.removeLabel(issueNumber, config.labels.parent.paused);
      } catch (error) {
        core.warning(`Could not remove paused label: ${error.message}`);
      }

      await github.createComment(
        issueNumber,
        `▶️ **Agent Resumed**\n\nTask dispatch resumed by @${actor}.`
      );

      await github.createWorkflowDispatch('agent-task-dispatcher.yml', ref, {
        parent_issue: issueNumber.toString(),
        trigger: 'resume'
      });

      core.info(`✓ Agent resumed for issue #${issueNumber}`);
    } else if (command === 'abort') {
      await github.addLabels(issueNumber, [config.labels.parent.blocked]);

      await github.createComment(
        issueNumber,
        `🛑 **Agent Aborted**\n\nPipeline aborted by @${actor}.`
      );

      core.info(`✓ Agent aborted for issue #${issueNumber}`);
    } else {
      core.setFailed(`Unknown command: ${command}`);
    }
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
