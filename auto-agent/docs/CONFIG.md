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

### Plan Contract (STRICT)

Plan YAML must satisfy strict machine contract before task creation.

- Contract source: `.github/scripts/lib/plan-schema.v1.json`
- Validator: `.github/scripts/validate-plan.js`
- Gate workflow: `.github/workflows/agent-plan-validation.yml`

Required root field:

- `tasks`

Required task fields:

- `id`, `title`, `level`, `deps`, `acceptance`

Rules:

- Top-level and task objects are extensible, but required fields must exist.
- `level` must be `l1|l2|l3`.
- `deps` must be an array (`[]` when no dependency exists).
- Runtime fields (`status`, `issue`, `pr`) are managed by state comment (`<!-- agent-state:json -->`) and must not appear in plan YAML.
- Forbidden alias keys fail immediately (for example: `dependencies`, `acceptance_criteria`, `risk_level`, Chinese alias keys).

Validation command:

```bash
node .github/scripts/validate-plan.js --file plans/issue-<epic-number>.yaml --strict --format copilot
```

### FlowMind Configuration

Controls the base directory for FlowMind-specific files.

```yaml
flowmind:
  base_dir: ".flowmind"
```

- **base_dir**: Base directory for FlowMind files (default: ".flowmind")

### Labels Configuration

Defines the label taxonomy used throughout the system.

#### Parent Issue Labels

Track the state of the main epic issue:

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

- **agent:task**: Marks an issue as a task (not a phase issue)
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
- **/retry**: Retry the current phase
- **/abort**: Abort the entire pipeline

### Retry Configuration

Controls retry behavior for failed phases.

```yaml
retry:
  max_attempts: 3
  create_new_issue: true
  delay_minutes: 5
```

- **max_attempts**: Maximum number of retry attempts for a failed phase (default: 3)
- **create_new_issue**: Whether to create a new Issue for retries (default: true)
- **delay_minutes**: Delay between retries in minutes (default: 5)

### Phases Configuration

Defines phase-specific settings for the Phase Issue workflow.

```yaml
phases:
  spec:
    output_file: "spec.md"
    timeout_minutes: 20
  plan:
    output_files:
      - "plan.yaml"
      - "plan.md"
    timeout_minutes: 20
```

- **spec.output_file**: Filename for specification document
- **spec.timeout_minutes**: Timeout for spec generation
- **plan.output_files**: List of plan output files (YAML and Markdown)
- **plan.timeout_minutes**: Timeout for plan generation

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
 - Create epic request issues
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

## Prompt Templates

The agent uses prompt templates to generate instructions for GitHub Copilot. You can customize these templates or use the builtin defaults.

### Configuration

```yaml
prompts:
  override_dir: null              # Custom template directory (optional)
  strict_variables: true          # Fail on missing variables (recommended)
```

### Template Directory Structure

Builtin templates are located at `.github/scripts/prompts/`:

```
prompts/
├── phase/
│   ├── spec.md                 # Phase spec prompt
│   ├── plan.md                 # Phase plan prompt
│   └── execution.md            # Phase execution prompt
└── dispatch/
    └── task.md                 # Task dispatch prompt
```

### Customizing Templates

To customize prompts:

1. **Create override directory**:
   ```bash
   mkdir -p .github/agent/prompts
   ```

2. **Copy template to override**:
   ```bash
   cp .github/scripts/prompts/phase/spec.md .github/agent/prompts/phase/
   ```

3. **Edit the template**:
   - Modify prompt text as needed
   - Keep `{{variable}}` placeholders intact
   - Preserve v2 marker block (`Agent-Schema-Version`, `Agent-Parent-Issue`, `Agent-PR-Type`/`Agent-Issue-Type`, `Agent-Phase-Name`/`Agent-Task-Key`)

4. **Update config.yml**:
   ```yaml
   promperride_dir: .github/agent/prompts
   ```

### Template Variables

Templates use `{{variableName}}` syntax (camelCase):

**phase/** templates:
- `{{epicNumber}}` - Epic issue number
- `{{baseBranch}}` - Target branch name
- `{{specDir}}`, `{{planYamlDir}}`, `{{planMdDir}}` - Directory paths

**dispatch/task.md**:
- `{{taskKey}}` - Task key (`task-<slug>`)
- `{{taskLevel}}` - Risk level (l1/l2/l3)
- `{{taskTitle}}` - Task title
- `{{acceptance}}` - Acceptance criteria
- `{{parentIssue}}` - Parent issue number
- `{{riskNotes}}` - Risk level notes
- `{{baseBranch}}` - Target branch name
- `{{taskIssue}}` - Task issue number
- `{{taskBody}}` - Task issue body

### Strict Mode

**Recommended**: Keep `strict_variables: true` (default)

- **Strict mode (true)**: Missing variables cause errors with clear messages
- **Non-strict mode (false)**: Missing variables replaced with empty string

Example error (strict mode):
```
Error: Missing prompt variables: epicNumber, baseBranch
Template: phase/spec
Required: epicNumber, specDir, baseBranch
Provided: specDir
```

### Upgrading

When upgrading the agent:
- Builtin templates are updated automatically
- Override templates are NOT modified
- Review release notes for template changes
- Update overrides manually if needed

### Best Practices

1. **Start with builtins**: Use default templates first
2. **Override selectively**: Only customize what you need
3. **Preserve markers**: Keep `Agent-*` markers intact
4. **Test changes**: Verify prompts render correctly
5. **Version control**: Commit override templates to git
6. **Document changes**: Note why you customized templates

## Validation

The configuration is validated against `auto-agent/docs/config.schema.json`. Invalid configurations will cause workflows to fail immediately.

To validate manually:

```bash
npm install -g ajv-cli
ajv validate -s auto-agent/docs/config.schema.json -d .github/agent/config.yml
```
