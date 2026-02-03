#!/usr/bin/env node

const core = require('@actions/core');
const fs = require('fs');
const yaml = require('js-yaml');
const { GitHubClient } = require('./lib/github-client');
const { loadConfig } = require('./lib/config-loader');

async function main() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const dryRun = process.env.DRY_RUN === 'true';

    if (!token || !owner || !repo) {
      core.setFailed('Missing required environment variables');
      return;
    }

    const github = new GitHubClient(token, owner, repo);
    const config = loadConfig();

    if (dryRun) {
      core.info('🔍 Running in DRY RUN mode - no changes will be made');
    }

    const labelColors = {
      'agent:requested': '0E8A16',
      'agent:spec-in-progress': '1D76DB',
      'agent:spec-approved': '0E8A16',
      'agent:plan-in-progress': '1D76DB',
      'agent:plan-approved': '0E8A16',
      'agent:executing': 'FBCA04',
      'agent:done': '0E8A16',
      'agent:blocked': 'D93F0B',
      'agent:paused': 'FBCA04',
      'agent:task': '0052CC',
      'agent:pending': 'EDEDED',
      'agent:in-progress': 'FBCA04',
      'agent:in-review': '1D76DB',
      'agent:cancelled': '6E6E6E',
      'agent:l1': 'D4C5F9',
      'agent:l2': '9B51E0',
      'agent:l3': '5319E7',
      'agent:spec-pr': 'FF9800',
      'agent:plan-pr': 'FF9800',
      'agent:task-pr': 'FF9800',
      'agent:status-pr': 'FF9800',
      'agent:probe': '6E6E6E'
    };

    const labelDescriptions = {
      'agent:requested': 'Requirement issue created, awaiting spec generation',
      'agent:spec-in-progress': 'Copilot is generating specification document',
      'agent:spec-approved': 'Specification PR has been merged',
      'agent:plan-in-progress': 'Copilot is generating execution plan',
      'agent:plan-approved': 'Plan PR has been merged',
      'agent:executing': 'Tasks are being executed',
      'agent:done': 'All tasks completed successfully',
      'agent:blocked': 'Pipeline is blocked and requires intervention',
      'agent:paused': 'Pipeline is paused via /pause command',
      'agent:task': 'Task issue (not a requirement)',
      'agent:pending': 'Task is waiting to be started',
      'agent:in-progress': 'Task is currently being worked on',
      'agent:in-review': 'Task PR is awaiting review/merge',
      'agent:cancelled': 'Task was cancelled',
      'agent:l1': 'Level 1: Auto-merge allowed (allowlist + CI green)',
      'agent:l2': 'Level 2: Requires /approve-task command + CI green',
      'agent:l3': 'Level 3: Requires full PR review',
      'agent:spec-pr': 'Specification document PR',
      'agent:plan-pr': 'Plan document PR',
      'agent:task-pr': 'Task implementation PR',
      'agent:status-pr': 'Plan status update PR',
      'agent:probe': 'Probe issue for prerequisite checks'
    };

    const allLabels = new Set();

    function collectLabels(obj) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          allLabels.add(obj[key]);
        } else if (typeof obj[key] === 'object') {
          collectLabels(obj[key]);
        }
      }
    }

    collectLabels(config.labels);

    const existingLabels = await github.octokit.rest.issues.listLabelsForRepo({
      owner,
      repo,
      per_page: 100
    });

    const existingLabelMap = new Map(
      existingLabels.data.map(label => [label.name, label])
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const labelName of allLabels) {
      const color = labelColors[labelName] || 'EDEDED';
      const description = labelDescriptions[labelName] || '';

      const existing = existingLabelMap.get(labelName);

      if (!existing) {
        if (dryRun) {
          core.info(`[DRY RUN] Would create label: ${labelName}`);
        } else {
          await github.octokit.rest.issues.createLabel({
            owner,
            repo,
            name: labelName,
            color: color,
            description: description
          });
          core.info(`✓ Created label: ${labelName}`);
        }
        created++;
      } else if (existing.color !== color || existing.description !== description) {
        if (dryRun) {
          core.info(`[DRY RUN] Would update label: ${labelName}`);
          if (existing.color !== color) {
            core.info(`  Color: ${existing.color} → ${color}`);
          }
          if (existing.description !== description) {
            core.info(`  Description: "${existing.description}" → "${description}"`);
          }
        } else {
          await github.octokit.rest.issues.updateLabel({
            owner,
            repo,
            name: labelName,
            color: color,
            description: description
          });
          core.info(`✓ Updated label: ${labelName}`);
        }
        updated++;
      } else {
        core.info(`- Skipped label (already exists): ${labelName}`);
        skipped++;
      }
    }

    const mode = dryRun ? ' (DRY RUN)' : '';
    core.info(`\nSummary${mode}:`);
    core.info(`  Created: ${created}`);
    core.info(`  Updated: ${updated}`);
    core.info(`  Skipped: ${skipped}`);
    core.info(`  Total: ${allLabels.size}`);

    if (dryRun) {
      core.summary
        .addHeading('Label Bootstrap Check (Dry Run)')
        .addRaw('ℹ️ This was a dry run. No labels were created or modified.\n\n')
        .addTable([
          [{data: 'Status', header: true}, {data: 'Count', header: true}],
          ['Would Create', created.toString()],
          ['Would Update', updated.toString()],
          ['Already Correct', skipped.toString()],
          ['Total Labels', allLabels.size.toString()]
        ])
        .write();
    } else {
      core.summary
        .addHeading('Label Bootstrap Complete')
        .addTable([
          [{data: 'Status', header: true}, {data: 'Count', header: true}],
          ['Created', created.toString()],
          ['Updated', updated.toString()],
          ['Skipped', skipped.toString()],
          ['Total', allLabels.size.toString()]
        ])
        .write();
    }
  } catch (error) {
    core.setFailed(error.message);
    process.exit(1);
  }
}

main();
