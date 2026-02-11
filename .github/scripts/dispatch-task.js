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

    core.info(`[DEBUG] GITHUB_REPOSITORY: ${process.env.GITHUB_REPOSITORY}`);
    core.info(`[DEBUG] AGENT_GH_TOKEN set: ${!!process.env.AGENT_GH_TOKEN}`);
    core.info(`[DEBUG] PARENT_ISSUE: ${process.env.PARENT_ISSUE}`);
    core.info(`[DEBUG] owner: ${owner}, repo: ${repo}`);

    if (!token || !issueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    core.info(`[DEBUG] config.paths.plan_yaml_dir: ${config.paths.plan_yaml_dir}`);
    const planPath = `${config.paths.plan_yaml_dir}/issue-${issueNumber}.yaml`;
    const fs = require('fs');
    const yaml = require('js-yaml');

    core.info(`[DEBUG] planPath: ${planPath}`);
    if (!fs.existsSync(planPath)) {
      core.setFailed(`Plan file not found: ${planPath}`);
      return;
    }

    const planContent = fs.readFileSync(planPath, 'utf8');
    core.info(`[DEBUG] Loaded plan file content:\n${planContent}`);
    const plan = yaml.load(planContent);

    if (!plan.tasks || plan.tasks.length === 0) {
      core.setFailed('No tasks found in plan');
      return;
    }

    core.info(`[DEBUG] Loaded plan.tasks: ${JSON.stringify(plan.tasks, null, 2)}`);

    plan.tasks.forEach(t =>
      core.info(`[DEBUG] task.id=${t.id}, status=${t.status}, deps=${JSON.stringify(t.deps)}`)
    );

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
      await github.createComment(
        issueNumber,
        '🎉 All Tasks Completed\n\nAll tasks successfully completed and merged.\n\nStatus: `done`'
      );
      return;
    }

    const nextTask = pendingTasks[0];
    core.info(`[DEBUG] Next task for dispatch: ${JSON.stringify(nextTask, null, 2)}`);

    // 兼容处理 deps 字段
    if (!('deps' in nextTask)) {
      core.info(`[WARN] task.id=${nextTask.id} 没有 deps 字段，自动补为 []`);
      nextTask.deps = [];
    }

    const depsSatisfied = (nextTask.deps || []).every(depId => {
      const depTask = plan.tasks.find(t => t.id === depId);
      core.info(`[DEBUG] Checking depId=${depId}, found depTask: ${JSON.stringify(depTask)}, status: ${depTask && depTask.status}`);
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

    core.info(`[DEBUG] Remove pending label: ${config.labels.task.pending}`);
    await github.removeLabel(nextTask.issue, config.labels.task.pending);

    core.info(`[DEBUG] Add in_progress label: ${config.labels.task.in_progress}`);
    await github.addLabels(nextTask.issue, [config.labels.task.in_progress]);

    // Build risk notes based on level
    let riskNotes = '';
    if (nextTask.level.toLowerCase() === 'l1') {
      riskNotes = '- This is a low-risk task (docs/tests only)\n- Will auto-merge after CI passes';
    } else if (nextTask.level.toLowerCase() === 'l2') {
      riskNotes = '- This is a medium-risk task\n- Requires `/approve-task` command after CI passes';
    } else if (nextTask.level.toLowerCase() === 'l3') {
      riskNotes = '- This is a high-risk task\n- Requires full review and approval before merge';
    }

    const prompt = loadPrompt('dispatch/task') || '';
    const info = [
      `🚦 Task Dispatch: [${nextTask.id}] ${nextTask.title}`,
      riskNotes,
      '',
      prompt
    ].join('\n');

    core.info(`[DEBUG] Create comment on issue ${nextTask.issue}:\n${info}`);
    await github.createComment(nextTask.issue, info);

    core.setOutput('dispatched_task', nextTask.id);
    core.info(`✅ Successfully dispatched task: ${nextTask.id}`);
  } catch (error) {
    core.error(`[ERROR] ${error.stack || error}`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();