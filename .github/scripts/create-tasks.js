#!/usr/bin/env node

const core = require('@actions/core');
const fs = require('fs');
const yaml = require('js-yaml');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { parseMarkers } = require('./lib/utils');

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
    const planPath = `${config.paths.plan_yaml_dir}/issue-${issueNumber}.yaml`;

    if (!fs.existsSync(planPath)) {
      core.setFailed(`Plan file not found: ${planPath}`);
      return;
    }

    const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));

    if (!plan || !Array.isArray(plan.tasks) || plan.tasks.length === 0) {
      core.setFailed('No tasks found in plan');
      return;
    }

    plan.tasks = plan.tasks.map((task, index) => normalizeTask(task, index));

    const existingIssues = await github.listIssues({
      labels: config.labels.task.task,
      state: 'all',
      perPage: 100
    });

    const taskIssueMap = new Map();
    for (const issue of existingIssues) {
      const markers = parseMarkers(issue.body || '');
      if (markers.parentIssue === issueNumber && markers.taskId) {
        taskIssueMap.set(markers.taskId, issue.number);
      }
    }

    const createdIssues = [];

    for (const task of plan.tasks) {
      let taskIssueNumber = taskIssueMap.get(task.id);

      if (!taskIssueNumber) {
        const issueBody = [
          '<!-- agent-task -->',
          '',
          'Parent Issue: #' + issueNumber,
          'Task ID: `' + task.id + '`',
          'Level: `' + task.level + '`',
          'Plan: `' + planPath + '`',
          '',
          '## Task Description',
          '',
          task.title,
          '',
          '## Acceptance Criteria',
          '',
          task.acceptance || 'See plan file for details',
          '',
          '## Dependencies',
          '',
          task.deps && task.deps.length > 0 ? task.deps.map(d => '- ' + d).join('\n') : 'None',
          '',
          '## Notes',
          '',
          task.notes || 'None',
          '',
          '---',
          '',
          'Agent-Parent-Issue: ' + issueNumber,
          'Agent-Task-Id: ' + task.id
        ].join('\n');

        const newIssue = await github.createIssue(
          `[Task ${task.id}] ${task.title}`,
          issueBody,
          [
            config.labels.task.task,
            config.labels.task.pending,
            config.labels.level[task.level] || config.labels.level.l1
          ]
        );

        taskIssueNumber = newIssue.number;
        core.info(`✓ Created task issue #${taskIssueNumber} for ${task.id}`);
      } else {
        core.info(`✓ Task issue #${taskIssueNumber} already exists for ${task.id}`);
      }

      createdIssues.push({ taskId: task.id, issueNumber: taskIssueNumber });
      task.issue = taskIssueNumber;
    }

    fs.writeFileSync(planPath, yaml.dump(plan));

    const planMdPath = `${config.paths.plan_md_dir}/issue-${issueNumber}.md`;
    const planMd = [
      `# 执行计划（Issue #${issueNumber}）`,
      '',
      '## 元信息',
      '',
      `- Parent Issue: #${issueNumber}`,
      `- 总任务数: ${plan.tasks.length}`,
      `- 最后更新: ${new Date().toISOString()}`,
      '',
      '## 任务列表',
      '',
      '| ID | Level | Status | Issue | PR | Acceptance |',
      '|----|-------|--------|-------|----|-----------| ',
      ...plan.tasks.map(t => `| ${t.id} | ${t.level} | ${t.status} | ${t.issue ? `#${t.issue}` : '-'} | ${t.pr ? `#${t.pr}` : '-'} | ${t.acceptance || 'See plan file for details'} |`),
      '',
      '## 任务详情',
      '',
      ...plan.tasks.map(t => [
        `### ${t.id}: ${t.title}`,
        '',
        `- Level: ${t.level}`,
        `- Status: ${t.status}`,
        `- Issue: ${t.issue ? `#${t.issue}` : 'Not created'}`,
        `- PR: ${t.pr ? `#${t.pr}` : 'Not created'}`,
        `- Dependencies: ${t.deps && t.deps.length > 0 ? t.deps.join(', ') : 'None'}`,
        '',
        'Acceptance Criteria:',
        t.acceptance || 'See plan file for details',
        '',
        t.notes ? `Notes:\n${t.notes}` : 'Notes:\nNone',
        ''
      ].join('\n')).join('\n---\n\n')
    ].join('\n');

    fs.writeFileSync(planMdPath, planMd);

    core.info('Task issues created and plan file updated.');
    core.setOutput('plan_updated', 'true');
    core.setOutput('tasks_created', createdIssues.length.toString());
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

function normalizeTask(task, index) {
  const normalized = task && typeof task === 'object' ? { ...task } : {};
  const id = normalizeTaskId(normalized.id, index);

  normalized.id = id;
  normalized.title = normalized.title ? String(normalized.title) : `Task ${index + 1}`;
  normalized.level = normalizeLevel(normalized.level);
  normalized.status = normalizeStatus(normalized.status);
  normalized.deps = Array.isArray(normalized.deps) ? normalized.deps.map(d => String(d)) : [];
  normalized.acceptance = normalized.acceptance
    ? String(normalized.acceptance)
    : '完成该任务并通过基础验证';
  normalized.notes = normalized.notes ? String(normalized.notes) : 'None';

  return normalized;
}

function normalizeTaskId(taskId, index) {
  if (!taskId) {
    return `task-${index + 1}`;
  }

  return String(taskId).trim();
}

function normalizeLevel(level) {
  const normalized = String(level || '').trim().toLowerCase();

  if (['l1', '1', 'low', 'level1', 'level-1'].includes(normalized)) {
    return 'l1';
  }

  if (['l2', '2', 'medium', 'med', 'level2', 'level-2'].includes(normalized)) {
    return 'l2';
  }

  if (['l3', '3', 'high', 'level3', 'level-3'].includes(normalized)) {
    return 'l3';
  }

  return 'l1';
}

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  const allowed = new Set(['pending', 'in-progress', 'in-review', 'done', 'blocked', 'cancelled']);

  return allowed.has(normalized) ? normalized : 'pending';
}

main();
