# Learnings

## Task 1: Configuration and Labels System

### Completed: 2026-02-02

**What was done:**
- Created `.github/agent/config.yml` with comprehensive configuration
- Created `docs/agent/config.schema.json` for validation
- Created `docs/agent/CONFIG.md` with detailed documentation
- Set up directory structure: `.github/agent/`, `docs/agent/`, `plans/`, `agent/src/`

**Key decisions:**
- Used YAML for config (human-readable, supports comments)
- Separated sensitive (secrets) from non-sensitive (config file) configuration
- Comprehensive label taxonomy covering all states: parent, task, level, PR types
- L1 allowlist focuses on safe paths: docs, tests, markdown, plans
- Sensitive globs protect critical infrastructure: workflows, configs, secrets

**Configuration highlights:**
- Copilot bot: `copilot-swe-agent[bot]`
- Timeouts: 20min (spec/plan), 45min (task), 30min (CI)
- CI mode: always `dispatch` (avoids PR trigger issues)
- Max L1 changed files: 300 (prevents risk escalation)
- Reconciliation: every 6 hours with auto-fix enabled

**Validation:**
- YAML syntax validated with Python yaml module
- JSON schema validated with Python json module
- All required fields from plan included
# Learnings

## Task 1: Configuration and Labels System

### Completed: 2026-02-02

**What was done:**
- Created `.github/agent/config.yml` with comprehensive configuration
- Created `docs/agent/config.schema.json` for validation
- Created `docs/agent/CONFIG.md` with detailed documentation
- Set up directory structure: `.github/agent/`, `docs/agent/`, `plans/`, `agent/src/`

**Key decisions:**
- Used YAML for config (human-readable, supports comments)
- Separated sensitive (secrets) from non-sensitive (config file) configuration
- Comprehensive label taxonomy covering all states: parent, task, level, PR types
- L1 allowlist focuses on safe paths: docs, tests, markdown, plans
- Sensitive globs protect critical infrastructure: workflows, configs, secrets

**Configuration highlights:**
- Copilot bot: `copilot-swe-agent[bot]`
- Timeouts: 20min (spec/plan), 45min (task), 30min (CI)
- CI mode: always `dispatch` (avoids PR trigger issues)
- Max L1 changed files: 300 (prevents risk escalation)
- Reconciliation: every 6 hours with auto-fix enabled

**Validation:**
- YAML syntax validated with Python yaml module
- JSON schema validated with Python json module
- All required fields from plan included


## Task 1.5: Labels Bootstrap Workflow

### Completed: 2026-02-02

**What was done:**
- Created `.github/workflows/agent-bootstrap.yml` workflow
- Implements idempotent label creation/update from config.yml
- Uses actions/github-script with js-yaml to parse config
- Assigns meaningful colors and descriptions to all labels

**Key features:**
- Trigger: workflow_dispatch (manual only)
- Reads all labels from config.yml recursively
- Creates missing labels
- Updates labels if color/description changed
- Skips labels that already match
- Provides summary report (created/updated/skipped counts)

**Label color scheme:**
- Parent states: Green (done/approved), Blue (in-progress), Yellow (executing/paused), Red (blocked)
- Task states: Gray (pending), Yellow (in-progress), Blue (in-review), Green (done), Gray (cancelled)
- Levels: Purple gradient (L1=light, L2=medium, L3=dark)
- PR types: Orange
- Special: Gray

**Validation:**
- YAML syntax validated
- Uses GitHub REST API for label management
- Idempotent - safe to run multiple times


## Task 2: Spec and Plan Templates

### Completed: 2026-02-02

**What was done:**
- Created `docs/agent/SPEC_TEMPLATE.md` - Chinese specification template
- Created `docs/agent/PLAN_TEMPLATE.md` - Chinese plan template  
- Created `docs/agent/plan.schema.json` - JSON schema for plan YAML validation
- Created `docs/agent/plan.example.yaml` - Example plan YAML file

**SPEC_TEMPLATE.md sections:**
- 背景与目标 (Background and Goals)
- 范围（包含/不包含）(Scope - In/Out)
- 用户故事/使用场景 (User Stories/Use Cases)
- 功能需求 (Functional Requirements)
- 非功能需求 (Non-functional Requirements)
- 技术方案（概要）(Technical Approach)
- 验收标准 (Acceptance Criteria)
- 约束与限制 (Constraints and Limitations)
- 风险与回滚 (Risks and Rollback)
- 非目标 (Non-goals)

**PLAN_TEMPLATE.md structure:**
- Metadata (parent issue, status, timestamps)
- Task list table (ID, title, level, status, issue, PR, acceptance)
- Detailed task sections with acceptance criteria
- Execution strategy (serial execution)
- Progress tracking

**Plan YAML schema fields:**
- parent_issue, spec_path, created_at, updated_at, status
- tasks array with: id, title, description, level, status, issue, pr, deps, acceptance, notes, timestamps, retry_count
- Task status enum: pending, in-progress, in-review, blocked, done, cancelled
- Level enum: L1, L2, L3

**Validation:**
- JSON schema validated
- Example YAML validated
- All required sections present in templates


## Task 2.5: Issue Templates

### Completed: 2026-02-02

**What was done:**
- Created `.github/ISSUE_TEMPLATE/config.yml` - Issue template configuration
- Created `.github/ISSUE_TEMPLATE/agent-request.yml` - Agent request form template

**Agent request template features:**
- Form-based template with structured fields
- Auto-applies `agent:requested` label
- Includes marker `<!-- agent-request -->` to identify agent requests
- Fields: background, scope (in/out), acceptance criteria, constraints, additional info
- Provides guidance on ChatOps commands (/pause, /resume, /abort)
- Only accessible to repository collaborators

**Marker strategy:**
- `<!-- agent-request -->` - Identifies requirement issues (triggers intake)
- `<!-- agent-task -->` - Will be used for task sub-issues (prevents recursion)
- `<!--gent-probe -->` - Will be used for probe issues (prerequisite checks)

**Validation:**
- YAML syntax validated
- Marker present in template
- All required fields defined


## Task 0: Prerequisites Documentation

### Completed: 2026-02-02

**What was done:**
- Created `docs/agent/PREREQUISITES.md` - Comprehensive prerequisites guide

**Content includes:**
- Required GitHub features (Copilot, auto-merge, Actions permissions)
- Required secrets (AGENT_GH_TOKEN with detailed permissions)
- Optional secrets (webhook URL and signing key)
- Repository settings (branch protection, CODEOWNERS)
- Verification checklist
- Troubleshooting guide for common issues
- Security considerations

**Key sections:**
- How to check if Copilot is available
- How to create fine-grained PAT with correct permissions
- How to enable auto-merge
- How to configure Actions permissions
- Troubleshooting for common failures
- Security best practices

**Note**: This is documentation-only. The actual probe workflow (automated checking) is not implemented due to complexity blocker.


## Core Library Implementation Started

### Date: 2026-02-02

**What was done:**
- Created `agent/lib/github.js` - GitHub API wrapper using Octokit
- Created `agent/lib/state.js` - State management with version locking

**github.js features:**
- Issue operations (get, create comment, update, add/remove labels, assign)
- PR operations (get, list files, merge)
- Check-run creation
- Workflow dispatch
- Content retrieval

**state.js features:**
- Read state from issue comments (finds latest version)
- Write state with version locking and retry
- Initialize state for new issues
- Update task status
- Move cursor (for serial execution)
- Set paused flag

**Key design decisions:**
- Version locking prevents concurrent modification conflicts
- State stored in JSON code block within issue comment
- Marker-based identification for idempotent operations
- Retry logic for version conflicts (up to 3 attempts)

**Status:**
- Core libraries: 2/5 complete (github, state)
- Remaining: plan.js, commands.js, policies.js

