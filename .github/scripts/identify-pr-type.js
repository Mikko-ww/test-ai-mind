#!/usr/bin/env node

const core = require('@actions/core');
const github = require('@actions/github');
const { loadConfig } = require('./lib/config-loader');
const { parseAgentMetadata, MarkerValidationError } = require('./lib/marker-parser');

async function postMarkerErrorComment(token, prNumber, repository, error) {
  if (!token || !prNumber || !repository) {
    return;
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    return;
  }

  const octokit = github.getOctokit(token);
  const errorCode = error && error.code ? error.code : 'AGENT_MARKER_PARSE_ERROR';
  const errorMessage = error && error.message ? error.message : 'Unknown marker parse error';

  const body = [
    '## ❌ Agent Marker Validation Failed',
    '',
    `Error Code: \`${errorCode}\``,
    `Message: ${errorMessage}`,
    '',
    'Please update PR body marker block to a valid v2 format.',
    '',
    '### Valid examples',
    '',
    '**Spec PR**',
    '```',
    '<!-- agent-markers:start -->',
    'Agent-Schema-Version: 2',
    'Agent-Parent-Issue: 24',
    'Agent-PR-Type: spec',
    'Agent-Phase-Name: spec',
    '<!-- agent-markers:end -->',
    '```',
    '',
    '**Task PR**',
    '```',
    '<!-- agent-markers:start -->',
    'Agent-Schema-Version: 2',
    'Agent-Parent-Issue: 24',
    'Agent-PR-Type: task',
    'Agent-Task-Key: task-example',
    '<!-- agent-markers:end -->',
    '```'
  ].join('\n');

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body
  });
}

function validateTaskPRAuthor(prType, headRef, author) {
  if (prType !== 'task') {
    return;
  }

  if (!headRef.startsWith('copilot/')) {
    throw new MarkerValidationError(
      'AGENT_TASK_PR_HEAD_REF_INVALID',
      `Task PR head ref must start with 'copilot/', got: ${headRef}`
    );
  }

  const config = loadConfig();
  const allowlist = config.copilot?.bot_login_allowlist || [];
  if (!allowlist.includes(author)) {
    throw new MarkerValidationError(
      'AGENT_TASK_PR_AUTHOR_INVALID',
      `Task PR author is not in allowlist: ${author}`
    );
  }
}

async function main() {
  try {
    core.info('=== identify-pr-type.js starting ===');
    const prNumber = parseInt(process.env.PR_NUMBER, 10);
    const prBody = process.env.PR_BODY || '';
    const headRef = process.env.HEAD_REF || '';
    const author = process.env.PR_AUTHOR || '';
    const token = process.env.GITHUB_TOKEN;
    const repository = process.env.GITHUB_REPOSITORY;

    core.info(`Input parameters: prNumber=${prNumber}, headRef=${headRef}, author=${author}, repository=${repository}`);

    if (!prNumber) {
      core.setFailed('Missing PR_NUMBER environment variable');
      return;
    }

    core.info('Parsing agent metadata from PR body...');
    const metadata = parseAgentMetadata(prBody, 'pr');
    
    core.info(`Metadata parsed: prType=${metadata.prType}, parentIssue=${metadata.parentIssue}`);
    core.info('Validating task PR author if applicable...');
    validateTaskPRAuthor(metadata.prType, headRef, author);

    core.setOutput('pr_type', metadata.prType);
    core.setOutput('schema_version', String(metadata.schemaVersion));
    core.setOutput('parent_issue', String(metadata.parentIssue));
    core.setOutput('phase_name', metadata.phaseName || '');
    core.setOutput('task_key', metadata.taskKey || '');

    core.info(
      `PR Type: ${metadata.prType}, Parent: ${metadata.parentIssue}, Phase: ${metadata.phaseName || '-'}, Task Key: ${metadata.taskKey || '-'}`
    );

    console.log(JSON.stringify({
      prType: metadata.prType,
      schemaVersion: metadata.schemaVersion,
      parentIssue: metadata.parentIssue,
      phaseName: metadata.phaseName,
      taskKey: metadata.taskKey
    }));
    
    core.info('=== identify-pr-type.js completed successfully ===');
  } catch (error) {
    core.error(`=== identify-pr-type.js failed: ${error.message} ===`);
    try {
      await postMarkerErrorComment(
        process.env.GITHUB_TOKEN,
        parseInt(process.env.PR_NUMBER, 10),
        process.env.GITHUB_REPOSITORY,
        error
      );
    } catch (commentError) {
      core.warning(`Failed to post marker validation comment: ${commentError.message}`);
    }

    core.setFailed(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  postMarkerErrorComment,
  validateTaskPRAuthor,
  main
};
