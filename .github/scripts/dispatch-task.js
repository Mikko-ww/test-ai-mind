#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { getLatestState, createStateComment } = require('./lib/state-manager');
const { buildCustomInstructions } = require('./lib/utils');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.PARENT_ISSUE);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    if (!token || !issueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    const state = await getLatestState(github, issueNumber, config.state.marker);
    if (!state) {
      core.setFailed('No state found for parent issue');
      return;
    }

    if (state.paused) {
      core.info('⏸️ Dispatch paused');
      return;
    }

    const planPath = `${config.paths.plan_yaml_dir}/issue-${issueNumber}.yaml`;
    const fs = require('fs');
    const yaml = require('js-yaml');

    if (!fs.existsSync(planPath)) {
      core.setFailed(`Plan file not found: ${planPath}`);
      return;
    }

    const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));

    const inProgressTasks = plan.tasks.filter(t => t.status === 'in-progress');
    if (inProgressTasks.length > 0) {
      core.info(`⏳ Task ${inProgressTasks[0].id} is already in progress`);
      return;
    }

    const pendingTasks = plan.tasks.filter(t => t.status === 'pending');
    if (pendingTasks.length === 0) {
      core.info('✅ All tasks completed');

      await github.removeLabel(issueNumber, config.labels.parent.executing);
      await github.addLabels(issueNumber, [config.labels.parent.done]);
      await github.createComment(issueNumber, 
        '🎉 All Tasks Completed\n\nAll tasen successfully completed and merged.\n\nStatus: `done`'
      );
      return;
    }

    const nextTask = pendingTasks[0];

    const depsSatisfied = nextTask.deps.every(depId => {
      const depTask = plan.tasks.find(t => t.id === depId);
      return depTask && depTask.status === 'done';
    });

    if (!depsSatisfied) {
      core.info(`⏳ Task ${nextTask.id} waiting for dependencies`);
      return;
    }

    if (!nextTask.issue) {
      core.setFailed(`Task ${nextTask.id} has no associated issue`);
      return;
    }

    const taskIssue = await github.getIssue(nextTask.issue);

    await github.removeLabel(nextTask.issue, config.labels.task.pending);
    await github.addLabels(nextTask.issue, [config.labels.task.in_progress]);

    const customInstructions = buildCustomInstructions([
      '# Task: ' + nextTask.title,
      '',
      'Parent Issue: #' + issueNumber,
      'Task ID: ' + nextTask.id,
      'Level: ' + nextTask.level,
      '',
      '## Task Description',
      '',
      taskIssue.body,
      '',
      '## Acceptance Criteria',
      '',
      nextTask.acceptance,
      '',
      '## Implementation Guidelines',
      '',
      '1. Follow the acceptance criteria exactly',
      '2. Write tests for your changes',
      '3. Ensure code passes lint and tests',
      '4. Keep changes focused and atomic',
      '',
      '## PR Requirements',
      '',
      '1. PR title: "[' + nextTask.id + '] ' + nextTask.title + '"',
      '2. CRITICAL: PR body MUST include these markers:',
      '   ```',
      '   Agent-Parent-Issue: ' + issueNumber,
      '   Agent-Task-Id: ' + nextTask.id,
      '   ```',
      '3. Target branch: ' + config.copilot.base_branch,
      '4. Link to task issue: #' + nextTask.issue,
      '',
      '## Risk Level: ' + nextTask.level.toUpperCase(),
      '',
      nextTask.level === 'l1' ? '- This is a low-risk task (docs/tests only)\n- Will auto-merge after CI passes' : '',
      nextTask.level === 'l2' ? '- This is a medium-risk task\n- Requires `/approve-task` command after CI passes' : '',
      nextTask.level === 'l3' ? '- This is a high-risk task\n- Requires full PR review before merge' : ''
    ]);

    await github.updateIssue(nextTask.issue, {
      // assignees: [config.copilot.bot_assignee],
      agent_assignment: {
        target_repo: `${owner}/${repo}`,
        base_branch: config.copilot.base_branch,
        custom_instructions: customInstructions,
        custom_agent: '',
        model: ''
      }
    });

    state.cursor_task_id = nextTask.id;
    state.version += 1;
    state.updated_at = new Date().toISOString();

    await createStateComment(github, issueNumber, state, config.state.marker);

    await github.createComment(issueNumber, [
      '🚀 Task Dispatched',
      '',
      'Assigned task ' + nextTask.id + ' to ' + config.copilot.bot_assignee,
      '',
      '- Task: ' + nextTask.title,
      '- Issue: #' + nextTask.issue,
      '- Level: ' + nextTask.level,
      '',
      'Status: `in-progress`'
    ].join('\n'));

    core.info(`✓ Dispatched task ${nextTask.id} to Copilot`);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
