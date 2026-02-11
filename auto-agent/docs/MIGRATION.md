# Migration Guide

This guide explains how to migrate to the current single-chain architecture:

`agent-request -> spec -> plan -> task`

## What Changed

### Canonical chain

- Intake always starts from `spec`.
- Phase progression is fixed: `spec -> plan -> execution`.
- Task dispatch starts automatically after task creation.

### Removed legacy paths (breaking)

- Removed requirement phase path.
- Removed assign-based prompt path.
- Removed status PR path.
- Removed simple request template path.

### Marker contract

Use only:

- `Agent-Schema-Version: 2`
- `Agent-Parent-Issue: <number>`
- `Agent-PR-Type` / `Agent-Issue-Type`
- `Agent-Phase-Name` / `Agent-Task-Key`

Markers must be enclosed by marker block boundaries.

### State format

- Current state version: `17`
- Active phases: `spec`, `plan`, `execution`

## Breaking Changes

- In-progress repositories relying on removed legacy paths are not compatible.
- Existing old-flow Epic issues should be completed or aborted before migration.

## Migration Steps

### 1) Update tool and templates

```bash
npm install -g flowmind-cli@latest
# or
npx flowmind-cli@latest update
```

### 2) Update repository files

```bash
cd /path/to/your/repo
flowmind update
flowmind validate
```

### 3) Verify workflows and scripts

```bash
ls -la .github/workflows/agent-*.yml
ls -la .github/scripts/*.js
```

Ensure removed legacy files are absent:

- `agent-requirement-approval.yml`
- `assign-to-copilot.js`
- `create-status-pr.js`

### 4) Verify config and state

```bash
cat .github/agent/config.yml
```

Check:

- `paths` contains `spec_dir`, `plan_yaml_dir`, `plan_md_dir`
- no `requirement_dir`
- `phases` contains `spec`, `plan`

### 5) Smoke test

1. Create an issue from `agent-request` template.
2. Confirm `spec` phase issue is created.
3. Merge spec PR and confirm plan phase issue creation.
4. Merge plan PR and confirm task issues are created and first task dispatch starts.

## Troubleshooting

### Spec phase issue not created

- Check `agent-intake.yml` run logs.
- Verify issue body includes `<!-- agent-request -->`.

### Plan phase not created after spec merge

- Check `agent-pr-router.yml` logs.
- Verify PR body marker block includes:
  - `Agent-Schema-Version: 2`
  - `Agent-Parent-Issue`
  - `Agent-PR-Type: spec`
  - `Agent-Phase-Name: spec`

### Task dispatch does not start

- Check `agent-task-creator.yml` and `agent-task-dispatcher.yml` logs.
- Verify plan YAML exists in `plans/`.

### State mismatch

- Check state comment marker `<!-- agent-state:json -->` in Epic issue.
- Confirm state `version` is `17`.

## Rollback

If needed, restore from backup created by `flowmind update`:

```bash
cd .github
cp -r .agent-backup/TIMESTAMP/* ./
```

## FAQ

**Q: Can old in-progress Epic issues continue on the new version?**
No. Finish or abort old-flow issues before migration.

**Q: Do I need to update issue templates?**
Yes. Keep only the standard `agent-request` entry path.

**Q: What marker should PRs use now?**
Use v2 marker block fields (`Schema-Version`, `Parent-Issue`, `PR-Type`, and `Phase-Name/Task-Key`).
