#!/usr/bin/env node

const core = require('@actions/core');
const fs = require('fs');
const yaml = require('js-yaml');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');

async function main() {
  try {
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.PARENT_ISSUE);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const ref = process.env.GITHUB_REF || 'refs/heads/main';

    if (!token || !issueNumber || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();
    const branchName = `agent/plan-status/${issueNumber}/link-issues`;
    const baseBranch = config.copilot.base_branch;

    const baseRef = await github.octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`
    });

    try {
      await github.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.data.object.sha
      });
    } catch (e) {
      await github.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
        sha: baseRef.data.object.sha,
        force: true
      });
    }

    const planYamlPath = `${config.paths.plan_yaml_dir}/issue-${issueNumber}.yaml`;
    const planMdPath = `${config.paths.plan_md_dir}/issue-${issueNumber}.md`;

    const yamlContent = fs.readFileSync(planYamlPath, 'utf8');
    const mdContent = fs.readFileSync(planMdPath, 'utf8');

    const yamlBlob = await github.octokit.rest.git.createBlob({
      owner,
      repo,
      content: Buffer.from(yamlContent).toString('base64'),
      encoding: 'base64'
    });

    const mdBlob = await github.octokit.rest.git.createBlob({
      owner,
      repo,
      content: Buffer.from(mdContent).toString('base64'),
      encoding: 'base64'
    });

    const baseTree = await github.octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: baseRef.data.object.sha
    });

    const newTree = await github.octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseTree.data.sha,
      tree: [
        {
          path: planYamlPath,
          mode: '100644',
          type: 'blob',
          sha: yamlBlob.data.sha
        },
        {
          path: planMdPath,
          mode: '100644',
          type: 'blob',
          sha: mdBlob.data.sha
        }
      ]
    });

    const commit = await github.octokit.rest.git.createCommit({
      owner,
      repo,
      message: `chore(agent): link task issues to plan #${issueNumber}`,
      tree: newTree.data.sha,
      parents: [baseRef.data.object.sha]
    });

    await github.octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
      sha: commit.data.sha
    });

    const existingPRs = await github.octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${branchName}`,
      state: 'open'
    });

    if (existingPRs.data.length === 0) {
      await github.createPR(
        `[agent-status] Update plan with task issues #${issueNumber}`,
        branchName,
        baseBranch,
        `Agent-Parent-Issue: ${issueNumber}\nAgent-Task-Id: status-link-issues\n\nAutomatically generated PR to link task issues to plan.`
      );

      core.info('✓ Created status update PR');
    } else {
      core.info('✓ Status update PR already exists');
    }

    const plan = yaml.load(fs.readFileSync(planYamlPath, 'utf8'));
    await github.createComment(issueNumber, [
      '✅ Task Issues Created',
      '',
      `Created ${plan.tasks.length} task sub-issues. A status update PR has been created to link them to the plan.`,
      '',
      'Next: The first task will be assigned to Copilot once the status PR is merged.'
    ].join('\n'));

    core.info('✓ Status update complete');
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
