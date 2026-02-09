#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { buildCustomInstructions } = require('./lib/utils');
const { PHASES, updatePhaseStatus, getPhaseIssue } = require('./lib/phase-manager');
const { StateManager } = require('./lib/state-manager');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const epicIssueNumber = parseInt(process.env.PARENT_ISSUE);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    if (!token || !epicIssueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    const stateManager = new StateManager(github, epicIssueNumber);
    await stateManager.load();

    const requirementIssueNumber = getPhaseIssue(stateManager.state, PHASES.REQUIREMENT);
    
    if (requirementIssueNumber) {
      await github.updateIssue(requirementIssueNumber, { state: 'closed' });
      core.info(`Closed Requirement Issue #${requirementIssueNumber}`);
    }

    await updatePhaseStatus(stateManager.state, PHASES.REQUIREMENT, 'done', {
      completed_at: new Date().toISOString()
    });

    await stateManager.save();

    const { execSync } = require('child_process');
    execSync(`node ${__dirname}/create-phase-issue.js`, {
      env: {
        ...process.env,
        PHASE: PHASES.SPEC,
        EPIC_ISSUE: epicIssueNumber.toString()
      },
      stdio: 'inherit'
    });

    await github.createComment(epicIssueNumber, [
      '✅ **Requirement Phase Complete**',
      '',
      'The requirement document has been approved and merged.',
      '',
      '**Next Phase:** Specification (需求规格说明书)',
      '- A new Spec Issue has been created',
      '- Copilot will generate the detailed specification',
      '',
      '**Workflow Progress:**',
      '- ✅ Requirement Document',
      '- 🔄 Specification (in progress)',
      '- ⏳ Execution Plan',
      '- ⏳ Implementation'
    ].join('\n'));

    core.info('✓ Requirement merge handled successfully');
  } catch (error) {
    core.setFailed(`Failed to handle requirement merge: ${error.message}`);
    process.exit(1);
  }
}

main();
