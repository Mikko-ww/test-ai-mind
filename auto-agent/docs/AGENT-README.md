# Auto Agent README

This repository uses an autonomous GitHub workflow that turns issue requests into implementation PRs.

## Core Workflow

The system now runs on a single canonical chain:

`agent-request -> spec -> plan -> task execution`

### What this means

- Intake always starts from `spec`.
- Phase progression is fixed: `spec -> plan -> execution`.
- Task dispatch starts automatically after task issues are created.
- Task runtime (`status`, `issue`, `pr`) is tracked in `<!-- agent-state:json -->`, not in plan YAML.
- Legacy requirement/assign/status paths are removed.

## Marker Contract

PR/Issue bodies must use:

- `Agent-Schema-Version: 2`
- `Agent-Parent-Issue: <number>`
- `Agent-PR-Type` or `Agent-Issue-Type` (entity type)
- `Agent-Phase-Name` or `Agent-Task-Key` (mutually exclusive by type)

Markers must be inside:

- `<!-- agent-markers:start -->`
- `<!-- agent-markers:end -->`

## Main Workflows

- `agent-intake.yml`: process `agent-request` issues and create `spec` phase issue.
- `agent-pr-router.yml`: route `spec` / `plan` / `task` PR events.
- `agent-plan-validation.yml`: validate plan YAML contract on plan PR updates.
- `agent-task-creator.yml`: create task issues from plan.
- `agent-task-dispatcher.yml`: assign next executable task.
- `agent-ci.yml`: run checks and update check-runs.
- `agent-merge-policy.yml`: classify PR risk level (L1/L2/L3).
- `agent-commands.yml`: handle chat commands.
- `agent-reconcile.yml`: scheduled reconciliation (full preset).

## Typical User Flow

1. Create an issue from the `Agent Request` template.
2. Wait for the generated `spec` PR and merge it after review.
3. Wait for the generated `plan` PR and merge it after review.
4. Ensure `agent-plan-validation.yml` passes for the plan PR.
5. System creates task issues and starts dispatching tasks to Copilot.
6. Review task PRs based on risk level rules.

## Risk Levels

- `L1`: auto-merge when CI passes.
- `L2`: requires `/approve-task` after CI passes.
- `L3`: manual review required.

## Chat Commands

- `/approve-task`: approve and merge an L2 task PR.
- `/pause`: pause task dispatching.
- `/resume`: resume task dispatching.
- `/retry`: retry current phase.
- `/skip-phase`: skip current phase.
- `/cancel-phase`: cancel current phase.
- `/reopen`: reopen closed phase issue.
- `/abort`: stop the pipeline.

## Required Labels

The setup creates 21 labels in total, including:

- lifecycle: `agent:requested`, `agent:spec-in-progress`, `agent:plan-in-progress`, `agent:executing`, `agent:done`, `agent:blocked`, `agent:paused`
- task: `agent:task`, `agent:pending`, `agent:in-progress`, `agent:in-review`, `agent:cancelled`
- level: `agent:l1`, `agent:l2`, `agent:l3`
- PR type: `agent:spec-pr`, `agent:plan-pr`, `agent:task-pr`
- special: `agent:probe`

## Troubleshooting

### Spec phase issue not created

- Check `agent-intake.yml` logs.
- Verify issue body contains `<!-- agent-request -->`.

### Plan phase not created after spec merge

- Check `agent-pr-router.yml` logs.
- Verify PR body marker block includes `Agent-PR-Type: spec` and `Agent-Phase-Name: spec`.

### Task dispatch does not start

- Check `agent-task-creator.yml` and `agent-task-dispatcher.yml` logs.
- Verify `plans/issue-<id>.yaml` exists.

### CI does not run for task PR

- Check `agent-pr-router.yml` dispatch logs.
- Check `agent-ci.yml` run logs.

## Security Notes

- Only trusted collaborators should trigger the chain.
- Keep `AGENT_GH_TOKEN` scoped and rotated.
- L3 changes must be reviewed manually.
- Do not edit state comments manually (`<!-- agent-state:json -->`).

## Related Docs

- `auto-agent/docs/CONFIG.md`
- `auto-agent/docs/MIGRATION.md`
- `auto-agent/docs/WORKFLOW_CHAIN.zh-CN.md`
