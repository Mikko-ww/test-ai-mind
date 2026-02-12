#!/usr/bin/env node

const core = require('@actions/core');

async function main() {
  try {
    core.info('=== parse-command.js starting ===');
    const commentBody = process.env.COMMENT_BODY;

    core.info(`Parsing comment body: ${commentBody ? commentBody.substring(0, 100) : 'empty'}`);

    if (!commentBody) {
      core.setFailed('Missing COMMENT_BODY environment variable');
      return;
    }

    const comment = commentBody.trim();
    const commandLine = comment.split('\n')[0].trim();

    core.info(`Command line: ${commandLine}`);

    let command = null;
    if (commandLine === '/approve-task') command = 'approve-task';
    else if (commandLine === '/pause') command = 'pause';
    else if (commandLine === '/resume') command = 'resume';
    else if (commandLine === '/retry') command = 'retry';
    else if (commandLine === '/skip-phase') command = 'skip-phase';
    else if (commandLine === '/cancel-phase') command = 'cancel-phase';
    else if (commandLine === '/reopen') command = 'reopen';
    else if (commandLine === '/abort') command = 'abort';

    core.setOutput('command', command || '');
    core.info(`✓ Parsed command: ${command || 'none'}`);
    core.info('=== parse-command.js completed successfully ===');
  } catch (error) {
    core.error(`=== parse-command.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
