#!/usr/bin/env node

const core = require('@actions/core');
const fs = require('fs');
const yaml = require('js-yaml');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { tryParseAgentMetadata, buildMarkerBlock, schema } = require('./lib/marker-parser');

const TASK_KEY_PATTERN = new RegExp(schema.patterns.taskKey);

function slugifyTaskText(text) {
  return (text || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

function enforceMaxLength(taskKey, suffix = '') {
  const maxLength = 64;
  const suffixLength = suffix.length;
  const baseMax = maxLength - suffixLength;
  if (taskKey.length <= maxLength) {
    return taskKey + suffix;
  }

  const truncated = taskKey.slice(0, baseMax).replace(/-+$/g, '');
  return `${truncated}${suffix}`;
}

function buildBaseTaskKey(rawId, title) {
  let base = typeof rawId === 'string' ? rawId.trim().toLowerCase() : '';

  if (!TASK_KEY_PATTERN.test(base)) {
    base = `task-${slugifyTaskText(title || rawId)}`;
  }

  return enforceMaxLength(base);
}

function allocateUniqueTaskKey(base, usedKeys) {
  if (!usedKeys.has(base)) {
    return base;
  }

  let index = 2;
  while (index < 1000) {
    const suffix = `-${index}`;
    const candidate = enforceMaxLength(base, suffix);
    if (!usedKeys.has(candidate)) {
      return candidate;
    }
    index += 1;
  }

  throw new Error(`Unable to generate unique task key for: ${base}`);
}

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

    core.info(`[DEBUG] planPath: ${planPath}`);
    if (!fs.existsSync(planPath)) {
      core.setFailed(`Plan file not found: ${planPath}`);
      return;
    }

    const fileContent = fs.readFileSync(planPath, 'utf8');
    core.info(`[DEBUG] Loaded plan file content:\n${fileContent}`);

    const plan = yaml.load(fileContent);

    core.info(`[DEBUG] plan YAML loaded: ${JSON.stringify(plan, null, 2)}`);

    if (!plan.tasks || plan.tasks.length === 0) {
      core.setFailed('No tasks found in plan');
      return;
    }

    core.info(`[DEBUG] plan.tasks count: ${plan.tasks.length}`);
    core.info(`[DEBUG] plan.tasks: ${JSON.stringify(plan.tasks, null, 2)}`);

    const existingIssues = await github.listIssues({
      labels: config.labels.task.task,
      state: 'all',
      perPage: 100
    });

    const taskIssueMap = new Map();
    for (const issue of existingIssues) {
      const parsed = tryParseAgentMetadata(issue.body || '', 'issue');
      if (
        parsed.ok &&
        parsed.metadata.issueType === 'task' &&
        parsed.metadata.parentIssue === issueNumber &&
        parsed.metadata.taskKey
      ) {
        taskIssueMap.set(parsed.metadata.taskKey, issue.number);
      }
    }

    const createdIssues = [];
    const usedTaskKeys = new Set(taskIssueMap.keys());

    for (const task of plan.tasks) {
      core.info(`[DEBUG] Processing task: ${JSON.stringify(task, null, 2)}`);
      const baseTaskKey = buildBaseTaskKey(task.id, task.title);
      const taskKey = taskIssueMap.has(baseTaskKey)
        ? baseTaskKey
        : allocateUniqueTaskKey(baseTaskKey, usedTaskKeys);

      usedTaskKeys.add(taskKey);
      task.id = taskKey;

      let taskIssueNumber = taskIssueMap.get(taskKey);

      if (!taskIssueNumber) {
        const markerBlock = buildMarkerBlock({
          parentIssue: issueNumber,
          issueType: 'task',
          taskKey
        }, 'issue');

        const issueBody = [
          'Parent Issue: #' + issueNumber,
          'Task Key: `' + taskKey + '`',
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
          markerBlock
        ].join('\n');

        core.info(`[DEBUG] Creating issue with title: [Task ${taskKey}] ${task.title}`);
        core.info(`[DEBUG] Issue body:\n${issueBody}`);

        const newIssue = await github.createIssue(
          `[Task ${taskKey}] ${task.title}`,
          issueBody,
          [
            config.labels.task.task,
            config.labels.task.pending,
            config.labels.level[task.level.toLowerCase()]
          ]
        );

        taskIssueNumber = newIssue.number;
        core.info(`✓ Created task issue #${taskIssueNumber} for ${taskKey}`);
      } else {
        core.info(`✓ Task issue #${taskIssueNumber} already exists for ${taskKey}`);
      }

      createdIssues.push({ taskKey, issueNumber: taskIssueNumber });
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
      ...plan.tasks.map(t => `| ${t.id} | ${t.level} | ${t.status} | ${t.issue ? `#${t.issue}` : '-'} | ${t.pr ? `#${t.pr}` : '-'} | ${t.acceptance} |`),
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
        t.acceptance,
        '',
        t.notes ? `Notes:\n${t.notes}` : '',
        ''
      ].join('\n')).join('\n---\n\n')
    ].join('\n');

    core.info(`[DEBUG] Saving plan markdown to: ${planMdPath}`);
    fs.writeFileSync(planMdPath, planMd);

    core.info(`[DEBUG] Created issues summary: ${JSON.stringify(createdIssues, null, 2)}`);
    core.setOutput('tasks_created', createdIssues.length.toString());
  } catch (error) {
    core.error(`[ERROR] ${error.stack || error}`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();