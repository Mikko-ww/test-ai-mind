#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { PHASES, updatePhaseStatus, getPhaseIssue } = require('./lib/phase-manager');
const { StateManager } = require('./lib/state-manager');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const epicIssueNumber = parseInt(process.env.PARENT_ISSUE);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const ref = process.env.GITHUB_REF || 'refs/heads/main';

    if (!token || !epicIssueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    const stateManager = new StateManager(github, epicIssueNumber);
    await stateManager.load();

    const planIssueNumber = getPhaseIssue(stateManager.state, PHASES.PLAN);

    if (planIssueNumber) {
      await github.updateIssue(planIssueNumber, { state: 'closed' });
      core.info(`Closed Plan Issue #${planIssueNumber}`);
    }

    await updatePhaseStatus(stateManager.state, PHASES.PLAN, 'done', {
      completed_at: new Date().toISOString()
    });

    stateManager.state.current_phase = PHASES.EXECUTION;

    await stateManager.save();

    await github.createComment(epicIssueNumber, [
      '✅ **Plan Phase Complete**',
      '',
      'The execution plan has been approved and merged.',
      '',
      '**Next Phase:** Task Execution',
      '- Creating task sub-issues...',
      '- Tasks will be assigned to Copilot for implementation',
      '',
      '**Workflow Progress:**',
      '- ✅ Requirement Document',
      '- ✅ Specification',
      '- ✅ Execution Plan',
      '- 🔄 Implementation (starting)'
    ].join('\n'));

    await github.createWorkflowDispatch(
      'agent-task-creator.yml',
      ref.replace('refs/heads/', ''),
      { parent_issue: epicIssueNumber.toString() }
    );

    core.info('✓ Plan merge handled, triggered task creation');
  } catch (error) {
    core.setFailed(`Failed to handle plan merge: ${error.message}`);
    process.exit(1);
  }
}

main();
