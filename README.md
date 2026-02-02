# GitHub Autonomous Agent System

A GitHub-native autonomous agent that automates the Issue → Spec → Plan → Implementation workflow using GitHub Copilot.

## Status: Foundation Complete (4/13 tasks - 31%)

### ✅ Completed

**Wave 1: Foundation**
- ✅ Configuration system (`.github/agent/config.yml`)
- ✅ Label taxonomy and bootstrap workflow
- ✅ Chinese templates for Spec and Plan documents
- ✅ Issue templates with markers
- ✅ JSON schemas for validation

### 🚧 In Progress

**Wave 2-4: Core Orchestration** (Requires TypeScript implementation)
- 🔴 Intake workflow (entry point)
- 🔴 Spec → Plan workflow
- 🔴 Plan → Task issues workflow
- 🔴 Serial task dispatch
- 🔴 CI verification
- 🔴 L1/L2/L3 merge policies
- 🔴 Failure recovery & reconciliation
- 🔴 Notification system
- 🟡 Prerequisites detection

## Architecture

### Directory Structure

```
.github/
├── agent/
│   └── config.yml              # Main configuration
├── workflows/
│   └── agent-bootstrap.yml     # Label initialization
└── ISSUE_TEMPLATE/
    ├── config.yml
    └── agent-request.yml       # Requirement submission form

docs/
├── agent/
│   ├── CONFIG.md               # Configuration guide
│   ├── config.schema.json      # Config validation
│   ├── SPEC_TEMPLATE.md        # Chinese spec template
│   ├── PLAN_TEMPLATE.md        # Chinese plan template
│   ├── plan.schema.json        # Plan validation
│   └── plan.example.yaml       # Example plan

plans/                          # Plan storage (YAML + MD)
agent/src/                      # Orchestration modules (TODO)
```

### Key Design Decisions

1. **Language**: Node.js + TypeScript + Octokit
2. **State Storage**: JSON comment on parent issue with version locking
3. **CI Trigger**: Always `workflow_dispatch` (avoids PR trigger issues)
4. **Merge Strategy**: 
   - L1: Auto-merge (allowlist + CI green)
   - L2: Command approval (`/approve-task`)
   - L3: Full PR review
5. **Templates**: Chinese language, structured forms
6. **Label Taxonomy**: Comprehensive state tracking

## Configuration

See [`docs/agent/CONFIG.md`](docs/agent/CONFIG.md) for detailed configuration guide.

### Quick Start

1. **Bootstrap labels**:
   ```bash
   # Run the agent-bootstrap workflow manually
   gh workflow run agent-bootstrap.yml
   ```

2. **Configure secrets**:
   - `AGENT_GH_TOKEN`: Fine-grained PAT with required permissions
   - `AGENT_WEBHOOK_URL` (optional): Webhook endpoint
   - `AGENT_WEBHOOK_SECRET` (optional): Webhook signing key

3. **Submit a requirement**:
   - Create a new issue using the "Agent Request" template
   - Fill in background, scope, acceptance criteria
   - System will automatically generate Spec → Plan → Tasks

## Workflow

```
User submits Issue (with agent-request marker)
    ↓
System generates Spec PR (Chinese)
    ↓
User reviews and merges Spec PR
    ↓
System generates Plan PR (YAML + MD)
    ↓
User reviews and merges Plan PR
    ↓
System creates task sub-issues
    ↓
System assigns tasks to Copilot serially
    ↓
Each task produces a PR
    ↓
PRs mergedsed on level (L1/L2/L3)
    ↓
All tasks complete → Done
```

## ChatOps Commands

- `/pause` - Pause task dispatch
- `/resume` - Resume task dispatch
- `/retry` - Retry current task
- `/abort` - Abort entire pipeline
- `/approve-task` - Approve L2 task PR (for merge)

## Development Status

### Completed Foundation (4/13 tasks)

The foundation is solid and production-ready:
- Configuration system with validation
- Templates and schemas
- Label taxonomy
- Issue templates
- Bootstrap workflow

### Remaining Work (9/13 tasks)

Requires substantial TypeScript implementation:

**Core Modules Needed** (`agent/src/`):
- `state.ts` - State comment management with version locking
- `plan.ts` - Plan YAML parsing/updating
- `github.ts` - Octokit wrapper for GitHub API
- `commands.ts` - ChatOps command parsing
- `policies.ts` - L1/L2/L3 merge logic
- `notify.ts` - Notification system

**Workflows Needed** (`.github/workflows/`):
- `agent-intake.yml` - Entry point (issues: opened)
- `agent-commands.yml` - ChatOps handler (issue_comment)
- `agent-pr-router.yml` - PR routing and merge logic
- `agent-ci.yml` - CI verification (workflow_dispatch)
- `agent-reconcile.yml` - Reconciliation (schedule)

**Estimated Effort**: 7-11 days of focused development

## Prerequisites

- GitHub Copilot enabled for the repository
- Fine-grained PAT with required permissions
- Auto-merge enabled (for L1 automatic merging)
- Actions permissions configured

See `docs/agent/PREREQUISITES.md` (TODO) for detailed setup guide.

## Security

- Only repository collaborators can submit requirements
- Sensitive paths always require L3 (manual review)
- CI runs with minimal permissions (no secrets)
- State stored in issue comments (auditable)
- Webhook signatures for external notifications

## License

MIT

## Contributing

This is a work in progress. The foundation is complete, but core orchestration requires implementation.

See `.sisyphus/notepads/github-autonomous-agent/status.md` for detailed status and blockers.
