#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { buildCustomInstructions } = require('./lib/utils');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.PARENT_ISSUE);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const ref = process.env.GITHUB_REF || 'refs/heads/main';

    if (!token || !issueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();
    
    await github.removeLabel(issueNumber, config.labels.parent.spec_in_progress);
    await github.addLabels(issueNumber, [
      config.labels.parent.spec_approved,
      config.labels.parent.plan_in_progress
    ]);

    const customInstructions = buildCustomInstructions([
      '# Task: Generate Execution Plan (YAML + Chinese Markdown)',
      '',
      'Please create a detailed execution plan based on the approved specification.',
      '',
      '## Requirements:',
      '1. Create TWO files:',
      `   - \`${config.paths.plan_yaml_dir}/issue-${issueNumber}.yaml\` - Machine-readable plan (YAML)`,
      `   - \`${config.paths.plan_md_dir}/issue-${issueNumber}.md\` - Human-readable plan (Chinese)`,
      '',
      '2. YAML file structure (follow `docs/agent/plan.schema.json`):',
      '   ```yaml',
      '   tasks:',
      '     - id: task-1',
      '       title: "Task title"',
      '       level: l1  # or l2, l3',
      '       deps: []',
      '       status: pending',
      '       issue: null',
      '       pr: null',
      '       acceptance: "Acceptance criteria"',
      '       notes: ""',
      '   ```',
      '',
      '3. Markdown file structure (follow `docs/agent/PLAN_TEMPLATE.md`):',
      '   - Include task list with status',
      '   - Link to parent issue',
      '   - Chinese language',
      '',
      '4. Task levels:',
      '   - L1: Low-risk changes (docs, tests) - auto-merge',
      '   - L2: Medium-risk changes - requires `/approve-task` command',
      '   - L3: High-risk changes - requires PR review',
      '',
      '## PR Requirements:',
      `1. PR title: "[Plan] Issue #${issueNumber}: <brief description>"`,
      '2. IMPORTANT: PR body MUST include:',
      '   ```',
      `   Agent-Parent-Issue: ${issueNumber}`,
      '   Agent-Task-Id: plan',
      '   ```',
      `3. Target branch: ${config.copilot.base_branch}`,
      '',
      '## Notes:',
      '- Break down into 3-8 atomic tasks',
      '- Each task should be independently testable',
      '- Assign appropriate risk levels'
    ]);

    await github.updateIssue(issueNumber, {
      assignees: [config.copilot.bot_assignee],
      agent_assignment: {
        target_repo: `${owner}/${repo}`,
        base_branch: config.copilot.base_branch,
        custom_instructions: customInstructions,
        custom_agent: '',
        model: ''
      }
    });

    await github.createComment(issueNumber, [
      '✅ Spec Approved',
      '',
      `The specification has been merged. I've assigned ${config.copilot.bot_assignee} to generate an execution plan.`,
      '',
      'Next Steps:',
      '1. Copilot will create a Plan PR with YAML + Chinese markdown',
      '2. Review the task breakdown and risk levels',
      '3. After merge, task sub-issues will be created automatically',
      '',
      'Status: `plan-in-progress`'
    ].join('\n'));

    core.info('✓ Spec merge handled successfully');
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
