#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { buildCustomInstructions } = require('./lib/utils');
const { PHASES, updatePhaseStatus } = require('./lib/phase-manager');
const { StateManager } = require('./lib/state-manager');

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
    [PHASES.REQUIREMENT]: 'Requirement Document',
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
    `Agent-Phase: ${phase}`
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
  const instructions = {
    [PHASES.REQUIREMENT]: buildRequirementInstructions(config, epicNumber),
    [PHASES.SPEC]: buildSpecInstructions(config, epicNumber),
    [PHASES.PLAN]: buildPlanInstructions(config, epicNumber),
    [PHASES.EXECUTION]: buildExecutionInstructions(config, epicNumber)
  };
  
  return instructions[phase] || '';
}

function buildRequirementInstructions(config, epicNumber) {
  const reqDir = config.paths.requirement_dir || 'docs/requirements';
  
  return buildCustomInstructions([
    '# Task: Generate Requirement Document (需求文档)',
    '',
    'Create a concise requirement document based on the Epic issue.',
    '',
    '## Requirements:',
    `1. Create file: \`${reqDir}/issue-${epicNumber}.md\``,
    '2. Write in Chinese (中文)',
    '3. Keep it practical and test-oriented',
    '4. Include only: 背景, 目标, 范围, 验收标准',
    '',
    '## PR Requirements:',
    `1. Title: "[Requirement] Epic #${epicNumber}: <description>"`,
    '2. Body must include:',
    '   ```',
    `   Agent-Parent-Issue: ${epicNumber}`,
    '   Agent-Phase: requirement',
    '   ```',
    `3. Target branch: ${config.copilot.base_branch}`
  ]);
}

function buildSpecInstructions(config, epicNumber) {
  const specDir = config.paths.spec_dir || 'docs/specs';
  
  return buildCustomInstructions([
    '# Task: Generate Specification Document (规格说明书)',
    '',
    'Create a minimal specification for workflow testing.',
    '',
    '## Requirements:',
    `1. Create file: \`${specDir}/issue-${epicNumber}.md\``,
    '2. Write in Chinese (中文)',
    '3. Keep it short and concrete (about 200-500 words)',
    '4. Include only these sections:',
    '   - 背景与目标',
    '   - 范围（包含/不包含）',
    '   - 验收标准（3-5 条，可测试）',
    '   - 非目标',
    '',
    '## PR Requirements:',
    `1. Title: "[Spec] Epic #${epicNumber}: <description>"`,
    '2. Body must include:',
    '   ```',
    `   Agent-Parent-Issue: ${epicNumber}`,
    '   Agent-Task-Id: spec',
    '   Agent-Phase: spec',
    '   ```',
    `3. Target branch: ${config.copilot.base_branch}`
  ]);
}

function buildPlanInstructions(config, epicNumber) {
  const planYamlDir = config.paths.plan_yaml_dir || 'plans';
  const planMdDir = config.paths.plan_md_dir || 'plans';
  
  return buildCustomInstructions([
    '# Task: Generate Execution Plan (执行计划)',
    '',
    'Create a minimal execution plan for workflow testing.',
    '',
    '## Requirements:',
    `1. Create YAML: \`${planYamlDir}/issue-${epicNumber}.yaml\``,
    `2. Create Markdown: \`${planMdDir}/issue-${epicNumber}.md\``,
    '3. Write in Chinese (中文)',
    '4. Keep the plan small: only 1-3 tasks',
    '5. YAML MUST include a `tasks` array, each task contains:',
    '   - `id` (task-1/task-2...)',
    '   - `title`',
    '   - `level` (l1/l2/l3, default l1)',
    '   - `status` (pending)',
    '   - `deps` (array, can be empty)',
    '   - `acceptance` (short testable sentence)',
    '',
    '## PR Requirements:',
    `1. Title: "[Plan] Epic #${epicNumber}: <description>"`,
    '2. Body must include:',
    '   ```',
    `   Agent-Parent-Issue: ${epicNumber}`,
    '   Agent-Task-Id: plan',
    '   Agent-Phase: plan',
    '   ```',
    `3. Target branch: ${config.copilot.base_branch}`
  ]);
}

function buildExecutionInstructions(config, epicNumber) {
  return buildCustomInstructions([
    '# Task: Execute Implementation Tasks',
    '',
    'This phase involves executing the planned tasks.',
    'Task issues will be created automatically from the plan.',
    '',
    `Parent Epic: #${epicNumber}`
  ]);
}

function getPhaseDisplayName(phase) {
  const names = {
    [PHASES.REQUIREMENT]: '需求文档',
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
