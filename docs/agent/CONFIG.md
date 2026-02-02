# Agent Configuration Guide

This document explains the configuration options for the GitHub autonomous agent system.

## Configuration File Location

`.github/agent/config.yml`

## Configuration Sections

### Copilot Configuration

Controls how the agent interacts with GitHub Copilot coding agent.

```yaml
copilot:
  bot_assignee: "copilot-swe-agent[bot]"
  bot_login_allowlist:
    - "copilot-swe-agent"
    - "copilot-swe-agent[bot]"
  base_branch: "main"
```

- **bot_assignee**: Username used when assigning issues to Copilot via REST API
- **bot_login_allowlist**: List of allowed bot login names for PR author matching in events
- **base_branch**: Default base branch for Copilot to create PRs against

### Paths Configuration

Defines where different types of files are stored.

```yaml
paths:
  spec_dir: "docs/specs"
  plan_yaml_dir: "plans"
  plan_md_dir: "plans"
```

- **spec_dir**: Directory for specification documents (中文需求文档)
- **plan_yaml_dir**: Directory for machine-readable plan YAML files
- **plan_md_dir**: Directory for human-readable plan markdown files

### Labels Configuration

Defines the label taxonomy used throughout the system.

#### Parent Issue Labels

Track the state of the main requirement issue:

- **agent:requested**: Initial state when issue is created
- **agent:spec-in-progress**: Copilot is generating the spec
- **agent:spec-approved**: Spec PR has been merged
- **agent:plan-in-progress**: Copilot is generating the plan
- **agent:plan-approved**: Plan PR has been merged
- **agent:executing**: Tasks are being executed
- **agent:done**: All tasks completed
- **agent:blocked**: Pipeline is blocked (requires intervention)
- **agent:paused**: Pipeline is paused (via /pause command)

#### Task Issue Labels

Track individual task states:

- **agent:task**: Marks an issue as a task (not a requirement)
- **agent:pending**: Task is waiting to be started
- **agent:in-progress**: Task is currently being worked on
- **agent:in-review**: Task PR is awaiting review/merge
- **agent:done**: Task is completed
- **agent:blocked**: Task is blocked
- **agent:cancelled**: Task was cancelled

#### Level Labels

Indicate the merge policy level:

- **agent:l1**: Auto-merge allowed (allowlist + CI green)
- **agent:l2**: Requires `/approve-task` command + CI green
- **agent:l3**: Requires full PR review

#### PR Type Labels

Identify PR types:

- **agent:spec-pr**: Specification document PR
- **agent:plan-pr**: Plan document PR
- **agent:task-pr**: Task implementation PR
- **agent:status-pr**: Plan status update PR

#### Special Labels

- **agent:probe**: Marks probe issues used for prerequisite checks

### Merge Policy Configuration

Controls automatic merge behavior and safety rules.

#### L1 Allowlist

File patterns that are safe for automatic merge:

```yaml
merge_policy    allowlist_globs:
      - "docs/**"
      - "*.md"
      - "tests/**"
      - "**/*.test.js"
      - "**/*.test.ts"
      - "**/*.spec.js"
      - "**/*.spec.ts"
      - "plans/**"
```

PRs that only touch these paths can be auto-merged if CI passes.

#### Sensitive Paths

Paths that always require manual review (L3):

```yaml
merge_policy:
  sensitive_globs:
    - ".github/workflows/**"
    - ".github/actions/**"
    - "**/*.yml"
    - "**/*.yaml"
    - ".github/**"
    - "package.json"
    - "package-lock.json"
    - "yarn  - "pnpm-lock.yaml"
    - "Dockerfile"
    - "docker-compose.yml"
    - ".env*"
    - "**/*secret*"
    - "**/*credential*"
    - "**/*token*"
```

Any PR touching these paths is automatically upgraded to L3.

#### Changed Files Limit

```yaml
merge_policy:
  max_changed_files_l1: 300
```

PRs with more than this many changed files are automatically upgraded to L3 to prevent risk escalation.

### CI Configuration

Controls how CI is triggered and validated.

```yaml
ci:
  mode: "dispatch"
  workflow: "agent-ci.yml"
  required_check_name: "agent/ci"
  commands:
    lint: "npm run lint"
    test: "npm test"
```

- **mode**: Always "dispatch" (uses workflow_dispatch to trigger CI)
- **workflow**: Name of the CI workflow file
- **required_check_name**: Check name that must pass for merge
- **commands**: Commands to run in CI (customize per project)

### Timeouts Configuration

Maximum wait times before marking operations as blocked.

```yaml
timeouts:
  spec_pr_minutes: 20
  plan_pr_minutes: 20
  task_pr_minutes: 45
  ci_minutes: 30
```

All values are in minutes.

### Notifications Configuration

Controls how the system sends notifications.

```yaml
notifications:
  github:
    enabled: true
  webhook:
    enabled: false
    secret_name: "AGENT_WEBHOOK_SECRET"
    url_secret_name: "AGENT_WEBHOOK_URL"
```

- **github.enabled**: Enable GitHub comments, labels, and checks
- **webhook.enabled**: Enable webhook notifications
- **webhook.secret_name**: GitHub Secret containing webhook signing key
- **webhook.url_secret_name**: GitHub Secret containing webhook URL

### ChatOps Commands

Commands that can be used in issue/PR comments.

```yaml
commands:
  approve_task: "/approve-task"
  pause: "/pause"
  resume: "/resume"
  retry: "/retry"
  abort: "/abort"
```

- **/approve-task**: Approve an L2 task PR for merge
- **/pause**: Pause task dispatch
- **/resume**: Resume task dispatch
- **/retry**: Retry the current task
- **/abort**: Abort the entire pipeline

### Retry Policy

Controls retry behavior for failed tasks.

```yaml
retry:
  max_retries: 2
  delay_minutes: 5
```

- **max_retries**: Maximum number of retry attempts per task
- **delay_minutes**: Delay between retry attempts

### Reconciliation Configuration

Controls the reconciliation workflow that detects and fixes inconsistencies.

```yaml
reconciliation:
  schedule: "0 */6 * * *"
  auto_fix_enabled: true
```

- **schedule**: Cron expression for reconciliation schedule (default: every 6 hours)
- **auto_fix_enabled**: Allow automatic fixes for safe inconsistencies

### State Management

Controls how state is stored and synchronized.

```yaml
state:
  marker: "<!-- agent-state:json -->"
  max_version_retries: 3
  concurrency_group: "agent-{repo}-issue-{parent_issue}"
```

- **marker**: HTML comment marker for state comments
- **max_version_retries**: Maximum retries for version conflict resolution
- **concurrency_group**: Template for workflow concurrency groups

## Security Considerations

### Secrets Required

The system requires the following GitHub Secrets:

1. **AGENT_GH_TOKEN**: Fine-grained PAT with permissions:
   - Metadata: Read
   - Issues: Read and write
   - Pull requests: Read and write
   - Contents: Read and write
   - Actions: Read and write
   - Checks: Read and write

2. **AGENT_WEBHOOK_SECRET** (optional): Webhook signing key
3. **AGENT_WEBHOOK_URL** (optional): Webhook endpoint URL

### Sensitive Path Protection

The system prevents automatic merge of PRs touching sensitive paths. Always review:
- Workflow files
- Configuration files
- Dependency manifests
- Secrets and credentictor Gating

Only repository collaborators (OWNER, MEMBER, COLLABORATOR) can:
- Create requirement issues
- Use ChatOps commands
- Approve L2 tasks

## Customization Examples

### Custom CI Commands

For a Python project:

```yaml
ci:
  commands:
    lint: "poetry run ruff check ."
    test: "poetry run pytest"
```

### Custom Allowlist

To allow auto-merge of configuration files:

```yaml
merge_policy:
  l1:
    allowlist_globs:
      - "docs/**"
      - "*.md"
      - "tests/**"
      - "plans/**"
      - "config/*.json"
```

### Stricter Timeouts

For faster feedback:

```yaml
timeouts:
  spec_pr_minutes: 10
  plan_pr_minutes: 10
  task_pr_minutes: 30
  ci_minutes: 15
```

## Validation

The configuration is validated against `docs/agent/config.schema.json`. Invalid configurations will cause workflows to fail immediately.

To validate manually:

```bash
npm install -g ajv-cli
ajv validate -s docs/agent/config.schema.json -d .github/agent/config.yml
```
