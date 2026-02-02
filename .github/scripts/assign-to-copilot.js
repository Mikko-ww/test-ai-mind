#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { buildCustomInstructions } = require('./lib/utils');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const taskType = process.env.TASK_TYPE; // 'spec' or 'plan'
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    if (!token || !issueNumber || !taskType || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    const botAssignee = config.copilot.bot_assignee;
    const baseBranch = config.copilot.base_branch;
    const repoFullName = `${owner}/${repo}`;

    let customInstructions;
    let specTimeout;

    if (taskType === 'spec') {
      const specDir = config.paths.spec_dir;
      specTimeout = config.timeouts.spec_pr_minutes || 20;

      customInstructions = `
# Task: Generate Chinese Specification Document

Please create a detailed Chinese specification document based on this requirement issue.

## Requirements:
1. Create a new file at: \`${specDir}/issue-${issueNumber}.md\`
2. Follow the template structure from \`docs/agent/SPEC_TEMPLATE.md\`
3. Include all sections: 背景与目标, 范围, 用户故事, 验收标准, 风险与回滚, 非目标
4. Write in Chinese (中文)
5. Be specific and detailed based on the issue description

## PR Requirements:
1. Create a PR with the spec document
2. PR title: "[Spec] Issue #${issueNumber}: <brief description>"
3. **IMPORTANT**: PR body MUST include these markers:
   \`\`\`
   Agent-Parent-Issue: ${issueNumber}
   Agent-Task-Id: spec
   \`\`\`
4. Target branch: ${baseBranch}

## Notes:
- Focus on clarity and completeness
- Ensure all acceptance criteria are measurable
- Identify risks and mitigation strategies
`.trim();
    } else if (taskType === 'plan') {
      const planYamlDir = config.paths.plan_yaml_dir;
      const planMdDir = config.paths.plan_md_dir;
      specTimeout = config.timeouts.plan_pr_minutes || 20;

      customInstructions = `
# Task: Generate Execution Plan

Please create a detailed execution plan based on the approved specification.

## Requirements:
1. Create TWO files:
   - \`${planYamlDir}/issue-${issueNumber}.yaml\` (machine-readable)
   - \`${planMdDir}/issue-${issueNumber}.md\` (human-readable, Chinese)
2. Follow the template structure from \`docs/agent/PLAN_TEMPLATE.md\`
3. Follow the schema from \`docs/agent/plan.schema.json\`
4. Break down into 3-8 tasks
5. Assign risk levels (l1/l2/l3) to each task
6. Define dependencies between tasks

## PR Requirements:
1. Create a PR with both plan files
2. PR title: "[Plan] Issue #${issueNumber}: <brief description>"
3. **IMPORTANT**: PR body MUST include these markers:
   \`\`\`
   Agent-Parent-Issue: ${issueNumber}
   Agent-Task-Id: plan
   \`\`\`
4. Target branch: ${baseBranch}

## Notes:
- Each task should be independently testable
- Use l1 for docs/tests, l2 for code changes, l3 for sensitive files
- Ensure dependencies are correctly specified
`.trim();
    } else {
      core.setFailed(`Unknown task type: ${taskType}`);
      return;
    }

    try {
      // Assign issue to Copilot with custom instructions
      await github.octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        assignees: [botAssignee],
        agent_assignment: {
          target_repo: repoFullName,
          base_branch: baseBranch,
          custom_instructions: customInstructions,
          custom_agent: '',
          model: ''
        }
      });

      core.info(`✓ Assigned issue #${issueNumber} to ${botAssignee}`);

      // Add comment to notify user
      const taskLabel = taskType === 'spec' ? 'specification' : 'execution plan';
      await github.createComment(
        issueNumber,
        `🤖 **Agent Started**\n\nI've assigned this issue to ${botAssignee} to generate a Chinese ${taskLabel}.\n\n**Next Steps:**\n1. Copilot will create a ${taskType.charAt(0).toUpperCase() + taskType.slice(1)} PR within ${specTimeout} minutes\n2. Review and approve the ${taskType.charAt(0).toUpperCase() + taskType.slice(1)} PR\n3. After merge, the system will automatically ${taskType === 'spec' ? 'generate a Plan' : 'create tasks and start execution'}\n\n**Status:** \`${taskType}-in-progress\``
      );
    } catch (error) {
      core.setFailed(`Failed to assign to Copilot: ${error.message}`);

      // Add blocked label and comment
      await github.addLabels(issueNumber, ['agent:blocked']);

      await github.createComment(
        issueNumber,
        `❌ **Agent Blocked**\n\nFailed to assign issue to Copilot.\n\n**Error:** ${error.message}\n\n**Possible causes:**\n- \`AGENT_GH_TOKEN\` secret is missing or has insufficient permissions\n- Copilot coding agent is not enabled for this repository\n- API rate limit exceeded\n\nPlease check the workflow logs and repository settings.`
      );

      throw error;
    }

    core.info(`✓ Copilot assignment complete`);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
