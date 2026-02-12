#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');

async function main() {
  try {
    core.info('=== update-labels.js starting ===');
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const removeLabels = process.env.REMOVE_LABELS ? process.env.REMOVE_LABELS.split(',').map(l => l.trim()) : [];
    const addLabels = process.env.ADD_LABELS ? process.env.ADD_LABELS.split(',').map(l => l.trim()) : [];
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    core.info(`Input parameters: owner=${owner}, repo=${repo}, issueNumber=${issueNumber}, removeLabels=${removeLabels.join(', ')}, addLabels=${addLabels.join(', ')}`);

    if (!token || !issueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    if (removeLabels.length === 0 && addLabels.length === 0) {
      core.setFailed('No labels to add or remove');
      return;
    }

    core.info('Creating GitHub client...');
    const github = new GitHubClient(token, owner, repo);

    if (removeLabels.length > 0) {
      core.info(`Removing ${removeLabels.length} labels...`);
      for (const label of removeLabels) {
        try {
          await github.removeLabel(issueNumber, label);
          core.info(`✓ Removed label: ${label}`);
        } catch (error) {
          core.warning(`Failed to remove label ${label}: ${error.message}`);
        }
      }
    }

    if (addLabels.length > 0) {
      core.info(`Adding ${addLabels.length} labels...`);
      await github.addLabels(issueNumber, addLabels);
      core.info(`✓ Added labels: ${addLabels.join(', ')}`);
    }

    core.info('✓ Labels updated successfully');
    core.info('=== update-labels.js completed successfully ===');
  } catch (error) {
    core.error(`=== update-labels.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
