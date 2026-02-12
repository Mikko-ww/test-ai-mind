#!/usr/bin/env node

const core = require('@actions/core');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');
const { PHASES, updatePhaseStatus, getPhaseIssue, getNextPhase } = require('./lib/phase-manager');
const { StateManager } = require('./lib/state-manager');
const { canRetry, incrementRetryCount } = require('./lib/retry-handler');
const { execSync } = require('child_process');

async function main() {
  try {
    core.info('=== handle-pause-resume.js starting ===');
    const token = process.env.AGENT_GH_TOKEN || process.env.GITHUB_TOKEN;
    const issueNumber = parseInt(process.env.ISSUE_NUMBER);
    const command = process.env.COMMAND;
    const actor = process.env.ACTOR;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const ref = process.env.GITHUB_REF || 'refs/heads/main';

    core.info(`Input parameters: owner=${owner}, repo=${repo}, issueNumber=${issueNumber}, command=${command}, actor=${actor}`);

    if (!token || !issueNumber || !command || !actor || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    core.info('Creating GitHub client and loading config...');
    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    if (command === 'pause') {
      core.info('Processing pause command...');
      await github.addLabels(issueNumber, [config.labels.parent.paused]);

      await github.createComment(
        issueNumber,
        `⏸️ **Agent Paused**\n\nTask dispatch paused by @${actor}.\n\nUse \`/resume\` to continue.`
      );

      core.info(`✓ Agent paused for issue #${issueNumber}`);
      core.info('=== handle-pause-resume.js completed successfully ===');
    } else if (command === 'resume') {
      core.info('Processing resume command...');
      try {
        await github.removeLabel(issueNumber, config.labels.parent.paused);
      } catch (error) {
        core.warning(`Could not remove paused label: ${error.message}`);
      }

      await github.createComment(
        issueNumber,
        `▶️ **Agent Resumed**\n\nTask dispatch resumed by @${actor}.`
      );

      await github.createWorkflowDispatch('agent-task-dispatcher.yml', ref, {
        parent_issue: issueNumber.toString(),
        trigger: 'resume'
      });

      core.info(`✓ Agent resumed for issue #${issueNumber}`);
    } else if (command === 'abort') {
      await github.addLabels(issueNumber, [config.labels.parent.blocked]);

      await github.createComment(
        issueNumber,
        `🛑 **Agent Aborted**\n\nPipeline aborted by @${actor}.`
      );

      core.info(`✓ Agent aborted for issue #${issueNumber}`);
    } else if (command === 'retry') {
      const stateManager = new StateManager(github, issueNumber);
      await stateManager.load();
      
      const currentPhase = stateManager.state.current_phase;
      if (!currentPhase) {
        await github.createComment(issueNumber, '❌ No active phase to retry.');
        return;
      }
      
      if (!canRetry(stateManager.state, currentPhase)) {
        await github.createComment(issueNumber, 
          `❌ **Retry Limit Reached**\n\nPhase "${currentPhase}" has already been retried 3 times.\n\nUse \`/skip-phase\` to move to the next phase.`
        );
        return;
      }
      
      const phaseIssueNumber = getPhaseIssue(stateManager.state, currentPhase);
      if (phaseIssueNumber) {
        await github.updateIssue(phaseIssueNumber, { state: 'closed' });
      }
      
      await incrementRetryCount(stateManager.state, currentPhase);
      await stateManager.save();
      
      execSync(`node ${__dirname}/create-phase-issue.js`, {
        env: {
          ...process.env,
          PHASE: currentPhase,
          EPIC_ISSUE: issueNumber.toString()
        },
        stdio: 'inherit'
      });
      
      await github.createComment(issueNumber,
        `🔄 **Phase Retry Initiated**\n\nRetrying phase "${currentPhase}" (attempt ${stateManager.state.phases[currentPhase].retry_count + 1}/3)\n\nA new Phase Issue has been created.`
      );
      
    } else if (command === 'skip-phase') {
      const stateManager = new StateManager(github, issueNumber);
      await stateManager.load();
      
      const currentPhase = stateManager.state.current_phase;
      if (!currentPhase) {
        await github.createComment(issueNumber, '❌ No active phase to skip.');
        return;
      }
      
      const phaseIssueNumber = getPhaseIssue(stateManager.state, currentPhase);
      if (phaseIssueNumber) {
        await github.updateIssue(phaseIssueNumber, { state: 'closed' });
      }
      
      await updatePhaseStatus(stateManager.state, currentPhase, 'skipped', {
        completed_at: new Date().toISOString()
      });
      
      const nextPhase = getNextPhase(currentPhase);
      if (nextPhase) {
        stateManager.state.current_phase = nextPhase;
        await stateManager.save();
        
        execSync(`node ${__dirname}/create-phase-issue.js`, {
          env: {
            ...process.env,
            PHASE: nextPhase,
            EPIC_ISSUE: issueNumber.toString()
          },
          stdio: 'inherit'
        });
        
        await github.createComment(issueNumber,
          `⏭️ **Phase Skipped**\n\n⚠️ Phase "${currentPhase}" has been skipped by @${actor}.\n\n**Warning:** Skipping phases may impact subsequent phases.\n\n**Next Phase:** ${nextPhase}`
        );
      } else {
        await stateManager.save();
        await github.createComment(issueNumber,
          `⏭️ **Phase Skipped**\n\nPhase "${currentPhase}" was the last phase. Epic is now complete.`
        );
      }
      
    } else if (command === 'cancel-phase') {
      core.info('Processing cancel-phase command...');
      const stateManager = new StateManager(github, issueNumber);
      await stateManager.load();
      
      const currentPhase = stateManager.state.current_phase;
      core.info(`Current phase: ${currentPhase}`);
      if (!currentPhase) {
        await github.createComment(issueNumber, '❌ No active phase to cancel.');
        return;
      }
      
      const phaseIssueNumber = getPhaseIssue(stateManager.state, currentPhase);
      if (phaseIssueNumber) {
        core.info(`Closing Phase Issue #${phaseIssueNumber}...`);
        await github.updateIssue(phaseIssueNumber, { state: 'closed' });
      }
      
      core.info('Updating phase status to cancelled...');
      await updatePhaseStatus(stateManager.state, currentPhase, 'cancelled', {
        completed_at: new Date().toISOString()
      });
      await stateManager.save();
      
      await github.createComment(issueNumber,
        `🛑 **Phase Cancelled**\n\nPhase "${currentPhase}" has been cancelled by @${actor}.\n\n**Options:**\n- Use \`/skip-phase\` to move to the next phase\n- Use \`/abort\` to cancel the entire Epic\n- Use \`/retry\` to retry this phase`
      );
      core.info('=== handle-pause-resume.js completed successfully ===');
      
    } else if (command === 'reopen') {
      core.info('Processing reopen command...');
      const stateManager = new StateManager(github, issueNumber);
      await stateManager.load();
      
      const currentPhase = stateManager.state.current_phase;
      core.info(`Current phase: ${currentPhase}`);
      if (!currentPhase) {
        await github.createComment(issueNumber, '❌ No phase to reopen.');
        return;
      }
      
      const phaseIssueNumber = getPhaseIssue(stateManager.state, currentPhase);
      if (!phaseIssueNumber) {
        core.info('No Phase Issue found');
        await github.createComment(issueNumber, `❌ No Phase Issue found for "${currentPhase}".`);
        return;
      }
      
      core.info(`Checking Phase Issue #${phaseIssueNumber} state...`);
      const phaseIssue = await github.getIssue(phaseIssueNumber);
      if (phaseIssue.state === 'open') {
        core.info('Phase Issue is already open');
        await github.createComment(issueNumber, `ℹ️ Phase Issue #${phaseIssueNumber} is already open.`);
        return;
      }
      
      core.info('Reopening Phase Issue...');
      await github.updateIssue(phaseIssueNumber, { state: 'open' });
      
      core.info('Updating phase status to in-progress...');
      await updatePhaseStatus(stateManager.state, currentPhase, 'in-progress', {
        started_at: stateManager.state.phases[currentPhase].started_at || new Date().toISOString()
      });
      await stateManager.save();
      
      await github.createComment(issueNumber,
        `🔓 **Phase Issue Reopened**\n\nPhase Issue #${phaseIssueNumber} has been reopened by @${actor}.\n\nPhase "${currentPhase}" status restored to 'in-progress'.`
      );
      
      await github.createComment(phaseIssueNumber,
        `🔓 **Issue Reopened**\n\nThis Phase Issue was reopened by @${actor} via Epic Issue #${issueNumber}.\n\nYou can continue working on this phase.`
      );
      core.info('=== handle-pause-resume.js completed successfully ===');
      
    } else {
      core.setFailed(`Unknown command: ${command}`);
    }
  } catch (error) {
    core.error(`=== handle-pause-resume.js failed: ${error.message} ===`);
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
