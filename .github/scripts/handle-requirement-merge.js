#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { buildCustomInstructions } = require('./lib/utils');

/**
 * Handle Requirement PR Merge
 * 
 * This script is triggered when a Requirement PR is merged.
 * It updates the parent issue state and triggers Spec generation.
 * 
 * Workflow:
 * 1. Reopen parent issue if it was auto-closed
 * 2. Update labels: requirement-in-progress → requirement-approved, spec-in-progress
 * 3. Assign to Copilot for Spec generation
 * 4. Add comment with next steps
 * 
 * Environment Variables:
 * - AGENT_GH_TOKEN: GitHub token with full permissions
 * - PARENT_ISSUE: Parent issue number
 * - GITHUB_REPOSITORY: Repository in format "owner/repo"
 */

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

    // Step 1: Ensure issue is open
    const issue = await github.getIssue(issueNumber);
    if (issue.state === 'closed') {
      core.info(`Issue #${issueNumber} is closed. Reopening...`);
      await github.updateIssue(issueNumber, { state: 'open' });
      await github.createComment(issueNumber, [
        '🔄 **Issue Reopened**',
        '',
        'This issue was automatically closed when the Requirement PR was merged.',
        'Reopening to continue the workflow: Requirement → **Spec** → Plan → Execution',
        '',
        '_Automated by GitHub Agent system_'
      ].join('\n'));
    }

    // Step 2: Update labels
    await github.removeLabel(issueNumber, 'agent:requirement-in-progress');
    await github.addLabels(issueNumber, [
      'agent:requirement-approved',
      'agent:spec-in-progress'
    ]);

    // Step 3: Build custom instructions for Spec generation
    const specDir = config.paths.spec_dir || 'docs/specs';
    const specTimeout = config.timeouts.spec_pr_minutes || 20;

    const customInstructions = buildCustomInstructions([
      '# Task: Generate Chinese Specification Document (需求规格说明书)',
      '',
      'Please create a detailed Chinese specification document based on the approved requirement document.',
      '',
      '## Requirements:',
      `1. Create a new file at: \`${specDir}/issue-${issueNumber}.md\``,
      '2. Follow the template structure from `auto-agent/docs/SPEC_TEMPLATE.md`',
      '3. Include all sections: 背景与目标, 范围, 用户故事, 验收标准, 风险与回滚, 非目标',
      '4. Write in Chinese (中文)',
      '5. Be specific and detailed based on the requirement document',
      '',
      '## Analysis Guidelines:',
      '- Review the approved requirement document carefully',
      '- Expand user stories with concrete examples',
      '- Define measurable acceptance criteria',
      '- Identify technical risks and mitigation strategies',
      '- Clarify what is explicitly out of scope',
      '',
      '## PR Requirements:',
      `1. PR title: "[Spec] Issue #${issueNumber}: <brief description>"`,
      '2. **IMPORTANT**: PR body MUST include these markers:',
      '   ```',
      `   Agent-Parent-Issue: ${issueNumber}`,
      '   Agent-Task-Id: spec',
      '   ```',
      `3. Target branch: ${config.copilot.base_branch}`,
      '',
      '## Notes:',
      '- Focus on clarity and completeness',
      '- Ensure all acceptance criteria are measurable',
      '- This spec will be used to generate the execution plan'
    ]);

    // Step 4: Assign to Copilot
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

    // Step 5: Add comment with next steps
    await github.createComment(issueNumber, [
      '✅ **Requirement Document Approved**',
      '',
      'The requirement document has been reviewed and approved.',
      '',
      '**Next Steps:**',
      `1. ${config.copilot.bot_assignee} will generate a detailed Spec (需求规格说明书)`,
      `2. Spec PR will be created within ${specTimeout} minutes`,
      '3. Review and approve the Spec PR to proceed to planning phase',
      '',
      '**Current Status:** `spec-in-progress`',
      '',
      '**Workflow Progress:**',
      '- ✅ Requirement Document',
      '- 🔄 Specification (in progress)',
      '- ⏳ Execution Plan',
      '- ⏳ Implementation'
    ].join('\n'));

    core.info('✓ Requirement merge handled successfully');
  } catch (error) {
    core.setFailed(`Failed to handle requirement merge: ${error.message}`);
    process.exit(1);
  }
}

main();
