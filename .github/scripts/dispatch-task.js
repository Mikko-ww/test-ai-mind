#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { getLatestState, createStateComment } = require('./lib/state-manager');
const { loadPrompt } = require('./lib/prompt-loader');

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

    // Build risk notes based on level
    let riskNotes = '';
    if (nextTask.level.toLowerCase() === 'l1') {
      riskNotes = '- This is a low-risk task (docs/tests only)\n- Will auto-merge after CI passes';
    } else if (nextTask.level.toLowerCase() === 'l2') {
      riskNotes = '- This is a medium-risk task\n- Requires `/approve-task` command after CI passes';
    } else if (nextTask.level.toLowerCase() === 'l3') {
      riskNotes = '- This is a high-risk task\n- Requires full PR review before merge';
    }

    const customInstructions = loadPrompt('dispatch/task', {
      taskKey: nextTask.id,
      taskLevel: nextTask.level,
      taskLevelUpper: nextTask.level.toUpperCase(),
      taskTitle: nextTask.title,
      acceptance: nextTask.acceptance || 'No specific acceptance criteria',
      parentIssue: issueNumber,
      riskNotes,
      baseBranch: config.copilot.base_branch,
      taskIssue: nextTask.issue,
      taskBody: taskIssue.body || 'No description provided'
    });

    await github.updateIssue(nextTask.issue, {
      assignees: [config.copilot.bot_assignee],
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
