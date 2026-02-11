#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { buildCustomInstructions } = require('./lib/utils');
const { PHASES, updatePhaseStatus } = require('./lib/phase-manager');
const { StateManager } = require('./lib/state-manager');
const { loadPrompt } = require('./lib/prompt-loader');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const phase = process.env.PHASE;
    const epicIssueNumber = parseInt(process.env.EPIC_ISSUE);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    if (!token || !phase || !epicIssueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables: AGENT_GH_TOKEN, PHASE, EPIC_ISSUE, GITHUB_REPOSITORY');
      return;
    }

    if (!Object.values(PHASES).includes(phase)) {
      core.setFailed(`Invalid phase: ${phase}. Must be one of: ${Object.values(PHASES).join(', ')}`);
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    const epicIssue = await github.getIssue(epicIssueNumber);
    
    const stateManager = new StateManager(github, epicIssueNumber);
    await stateManager.load();
    
    const phaseState = stateManager.state.phases[phase];
    if (phaseState && phaseState.status === 'in-progress' && phaseState.issue_number) {
      core.setFailed(
        `❌ Concurrency Error: Phase "${phase}" is already in progress (Issue #${phaseState.issue_number}).\n` +
        `Cannot create a new Phase Issue while another is active.`
      );
      return;
    }
    
    const phaseIssueNumber = await createPhaseIssue(github, config, phase, epicIssue);
    
    core.setOutput('phase_issue_number', phaseIssueNumber);
    core.info(`✓ Created ${phase} issue #${phaseIssueNumber} for Epic #${epicIssueNumber}`);
  } catch (error) {
    core.setFailed(`Failed to create phase issue: ${error.message}`);
    process.exit(1);
  }
}

async function createPhaseIssue(github, config, phase, epicIssue) {
  const title = buildPhaseTitle(phase, epicIssue.number);
  const body = buildPhaseBody(phase, epicIssue);
  const labels = buildPhaseLabels(phase, epicIssue.number);
  
  const issue = await github.createIssue(title, body, labels);
  
  const customInstructions = buildPhaseInstructions(config, phase, epicIssue.number);
  
  await github.updateIssue(issue.number, {
    assignees: [config.copilot.bot_assignee],
    agent_assignment: {
      target_repo: `${github.owner}/${github.repo}`,
      base_branch: config.copilot.base_branch,
      custom_instructions: customInstructions,
      custom_agent: '',
      model: ''
    }
  });
  
  await github.createComment(epicIssue.number, [
    `🔄 **${getPhaseDisplayName(phase)} Started**`,
    '',
    `Created ${phase} issue: #${issue.number}`,
    `Assigned to: ${config.copilot.bot_assignee}`,
    '',
    `The agent will generate the ${getPhaseDisplayName(phase)} and create a PR.`
  ].join('\n'));
  
  const stateManager = new StateManager(github, epicIssue.number);
  await stateManager.load();
  
  await updatePhaseStatus(stateManager.state, phase, 'in-progress', {
    issue_number: issue.number,
    started_at: new Date().toISOString()
  });
  
  stateManager.state.current_phase = phase;
  
  await stateManager.save();
  
  return issue.number;
}

function buildPhaseTitle(phase, epicNumber) {
  const phaseNames = {
    [PHASES.SPEC]: 'Specification',
    [PHASES.PLAN]: 'Execution Plan',
    [PHASES.EXECUTION]: 'Task Execution'
  };
  
  return `[${phaseNames[phase]}] Epic #${epicNumber}`;
}

function buildPhaseBody(phase, epicIssue) {
  const lines = [
    `## ${getPhaseDisplayName(phase)}`,
    '',
    `**Parent Epic:** #${epicIssue.number}`,
    `**Phase:** ${phase}`,
    '',
    '### Context',
    '',
    'This issue is part of the automated workflow for the parent Epic issue.',
    'Please generate the required deliverable based on the Epic requirements.',
    '',
    '### Epic Description',
    '',
    epicIssue.body || 'No description provided',
    '',
    '---',
    '',
    `Agent-Parent-Issue: ${epicIssue.number}`,
    `Agent-Task-Id: ${phase}`
  ];
  
  return lines.join('\n');
}

function buildPhaseLabels(phase, epicNumber) {
  return [
    `agent:phase:${phase}`,
    'agent:in-progress',
    `agent:parent:${epicNumber}`
  ];
}

function buildPhaseInstructions(config, phase, epicNumber) {
  const baseBranch = config.copilot.base_branch;
  
  const templateMap = {
    [PHASES.SPEC]: 'phase/spec',
    [PHASES.PLAN]: 'phase/plan',
    [PHASES.EXECUTION]: 'phase/execution'
  };
  
  const templateId = templateMap[phase];
  if (!templateId) {
    throw new Error(`Invalid phase: ${phase}`);
  }
  
  const variables = {
    epicNumber,
    baseBranch,
    specDir: config.paths.spec_dir || 'docs/specs',
    planYamlDir: config.paths.plan_yaml_dir || 'plans',
    planMdDir: config.paths.plan_md_dir || 'plans'
  };
  
  const rendered = loadPrompt(templateId, variables);
  return buildCustomInstructions(rendered.split('\n'));
}

function getPhaseDisplayName(phase) {
  const names = {
    [PHASES.SPEC]: '规格说明',
    [PHASES.PLAN]: '执行计划',
    [PHASES.EXECUTION]: '任务执行'
  };
  
  return names[phase] || phase;
}

if (require.main === module) {
  main();
}

module.exports = { createPhaseIssue };
