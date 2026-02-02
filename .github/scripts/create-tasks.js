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

    if (!plan.tasks || plan.tasks.length === 0) {
      core.setFailed('No tasks found in plan');
      return;
    }

    const { Octokit } = require('@octokit/rest');
    const octokit = new Octokit({ auth: token });
    
    const existingIssues = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner,
      repo,
      labels: config.labels.task.task,
      state: 'all',
      per_page: 100
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

        const newIssue = await github.octokit.rest.issues.create({
          owner,
          repo,
          title: `[Task ${task.id}] ${task.title}`,
          body: issueBody,
          labels: [
            config.labels.task.task,
            config.labels.task.pending,
            config.labels.level[task.level]
          ]
        });

        taskIssueNumber = newIssue.data.number;
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

    fs.writeFileSync(planMdPath, planMd);

    core.info('Creating status update PR...');
    core.setOutput('plan_updated', 'true');
    core.setOutput('tasks_created', createdIssues.length.toString());
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
