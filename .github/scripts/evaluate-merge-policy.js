#!/usr/bin/env node

const core = require('@actions/core');
const fs = require('fs');
const yaml = require('js-yaml');
const minimatch = require('minimatch');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const prNumber = parseInt(process.env.PR_NUMBER);
    const parentIssue = parseInt(process.env.PARENT_ISSUE);
    const taskId = process.env.TASK_ID;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    if (!token || !prNumber || !parentIssue || !taskId || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    const planPath = `${config.paths.plan_yaml_dir}/issue-${parentIssue}.yaml`;
    if (!fs.existsSync(planPath)) {
      core.setFailed(`Plan file not found: ${planPath}`);
      return;
    }

    const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));
    const task = plan.tasks.find(t => t.id === taskId);

    if (!task) {
      core.setFailed(`Task ${taskId} not found in plan`);
      return;
    }

    const declaredLevel = task.level;
    const files = await github.listPRFiles(prNumber);
    const changedFiles = files.map(f => f.filename);
    const maxFiles = config.merge_policy.max_changed_files_l1 || 300;

    let computedLevel = 'l1';
    let reason = 'All files in allowlist';
    const matchedRules = [];

    if (changedFiles.length > maxFiles) {
      computedLevel = 'l3';
     oo many changed files (${changedFiles.length} > ${maxFiles})`;
    } else {
      for (const file of changedFiles) {
        let matchedSensitive = false;
        let matchedAllowlist = false;

        for (const pattern of config.merge_policy.sensitive_globs) {
          if (minimatch(file, pattern)) {
            matchedSensitive = true;
            matchedRules.push(`❌ ${file} → ${pattern} (sensitive)`);
            break;
          }
        }

        if (matchedSensitive) {
          computedLevel = 'l3';
          reason = 'Contains sensitive file changes';
          break;
        }

        for (const pattern of config.merge_policy.l1.allowlist_globs) {
          if (minimatch(file, pattern)) {
            matchedAllowlist = true;
            matchedRules.push(`✓ ${file} → ${pattern} (allowlist)`);
            break;
          }
        }

        if (!matchedAllowlist) {
          computedLevel = 'l2';
          reason = 'Contains files outside allowlist';
          matchedRules.push(`⚠️ ${file} (not in allowlist)`);
        }
      }
    }

    const finalLevel = computedLevel === 'l1' && declaredLevel !== 'l1' ? declaredLevel :
                      computedLevel === 'l2' && declaredLevel === 'l3' ? declaredLevel :
                      computedLevel;

    const levelLabel = config.labels.level[finalLevel];

    await github.addLabels(prNumber, [levelLabel, config.labels.pr.task]);

    const policyComment = [
      '## 🔒 Merge Policy Evaluation',
      '',
      `Task: ${taskId}`,
      `Declared Level: \`${declaredLevel}\``,
      `Computed Level: \`${computedLevel}\``,
      `Final Level: \`${finalLevel}\``,
      '',
      `Reason: ${reason}`,
      '',
      `Changed Files: ${changedFiles.length}`,
      '',
      '### File Analysis',
      '',
      ...matchedRules.slice(0, 20),
      matchedRules.length > 20 ? `\n... and ${matchedRules.length - 20} more files` : '',
      '',
      '### Merge Requirements',
      '',
      finalLevel === 'l1' ? 'L1 - Auto-merge\n- ✅ All files in allowlist\n- ⏳ Waiting for CI checks to pass\n- 🤖 Will auto-merge when checks are green' : '',
      finalLevel === 'l2' ? 'L2 - Command approval required\n- ⚠️ Contains files outside allowlist\n- ⏳ Waiting for CI checks to pass\n- 👤 Requires `/approve-task` command from collaborn      finalLevel === 'l3' ? 'L3 - Full PR review required\n- ❌ Contains sensitive file changes or too many files\n- ⏳ Waiting for CI checks to pass\n- 👥 Requires full PR review approval' : ''
    ].filter(line => line !== '').join('\n');

    await github.createComment(prNumber, policyComment);

    core.setOutput('final_level', finalLevel);
    core.setOutput('can_auto_merge', finalLevel === 'l1' ? 'true' : 'false');

    core.info(`✓ Merge policy evaluated: ${finalLevel}`);
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
