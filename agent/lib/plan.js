const yaml = require('js-yaml');
const fs = require('fs');

class PlanManager {
  constructor(githubClient, config) {
    this.github = githubClient;
    this.config = config;
  }

  parsePlan(yamlContent) {
    try {
      const plan = yaml.load(yamlContent);
      this.validatePlan(plan);
      return plan;
    } catch (e) {
      throw new Error(`Failed to parse plan: ${e.message}`);
    }
  }

  validatePlan(plan) {
    if (!plan.parent_issue) throw new Error('Plan missing parent_issue');
    if (!plan.tasks || !Array.isArray(plan.tasks)) throw new Error('Plan missing tasks array');
    
    for (const task of plan.tasks) {
      if (!task.id) throw new Error(`Task missing id`);
      if (!task.title) throw new Error(`Task ${task.id} missing title`);
      if (!task.level || !['L1', 'L2', 'L3'].includes(task.level)) {
        throw new Error(`Task ${task.id} has invalid level: ${task.level}`);
      }
    }
  }

  async readPlan(planPath) {
    try {
      const content = await this.github.getContent(planPath);
      const yamlContent = Buffer.from(content.content, 'base64').toString('utf8');
      return this.parsePlan(yamlContent);
    } catch (e) {
      throw new Error(`Failed to read plan from ${planPath}: ${e.message}`);
    }
  }

  updateTaskInPlan(plan, taskId, updates) {
    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in plan`);
    }

    Object.assign(task, updates);
    plan.updated_at = new Date().toISOString();
    return plan;
  }

  serializePlan(plan) {
    return yaml.dump(plan, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
  }

  generateMarkdown(plan) {
    const issueNumber = plan.parent_issue;
    const totalTasks = plan.tasks.length;
    const completedTasks = plan.tasks.filter(t => t.status === 'done').length;
    
    let md = `# 执行计划（Issue #${issueNumber}）\n\n`;
    md += `## 元信息\n\n`;
    md += `- **Parent Issue**: #${issueNumber}\n`;
    if (plan.spec_path) {
      md += `- **Spec文档**: ${plan.spec_path}\n`;
    }
    md += `- **总任务数**: ${totalTasks}\n`;
    md += `- **已完成**: ${completedTasks}\n`;
    md += `- **当前状态**: ${plan.status || 'pending'}\n`;
    md += `- **最后更新**: ${plan.updated_at || plan.created_at}\n\n`;

    md += `## 任务等级说明\n\n`;
    md += `- **L1 (自动合并)**: 仅修改文档、测试或其他安全路径，CI通过后自动合并\n`;
    md += `- **L2 (命令批准)**: CI通过后需要协作者使用 \`/approve-task\` 命令批准合并\n`;
    md += `- **L3 (人工审查)**: 需要完整的PR Review流程，可能涉及敏感文件或复杂变更\n\n`;

    md += `## 任务列表\n\n`;
    md += `| ID | 标题 | 等级 | 状态 | Issue | PR | 验收标准 |\n`;
    md += `|----|------|------|------|-------|----|-----------|\n`;

    for (const task of plan.tasks) {
      const issueLink = task.issue ? `#${task.issue}` : '-';
      const prLink = task.pr ? `#${task.pr}` : '-';
      const acceptance = task.acceptance ? task.acceptance.slice(0, 2).join('; ') : '-';
      md += `| ${task.id} | ${task.title} | ${task.level} | ${task.status || 'pending'} | ${issueLink} | ${prLink} | ${acceptance} |\n`;
    }

    md += `\n---\n\n`;
    md += `**注意**: 本文档由 \`plans/${issueNumber}.yaml\` 自动生成，请勿手工编辑。\n`;

    return md;
  }

  getNextPendingTask(plan) {
    return plan.tasks.find(t => t.status === 'pending' || !t.status);
  }

  getTaskById(plan, taskId) {
    return plan.tasks.find(t => t.id === taskId);
  }

  isTaskComplete(task) {
    return task.status === 'done';
  }

  areAllTasksComplete(plan) {
    return plan.tasks.every(t => this.isTaskComplete(t));
  }
}

module.exports = { PlanManager };
