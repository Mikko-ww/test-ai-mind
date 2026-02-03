# GitHub Autonomous Agent System

[简体中文](README.zh-CN.md) | English

A GitHub-native autonomous agent that automates the Issue → Spec → Plan → Implementation workflow using GitHub Copilot.

## 🎉 Status: 100% Complete (13/13 tasks)

The GitHub Autonomous Agent is **feature-complete** and ready for production deployment!

### ✅ All Features Implemented

- ✅ **Core Orchestration**: Issue intake → Spec → Plan → Task dispatch
- ✅ **Copilot Integration**: Automatic code generation via GitHub Copilot
- ✅ **CI Verification**: Automated testing and validation
- ✅ **Merge Policies**: L1/L2/L3 risk-based merge strategies
- ✅ **Failure Recovery**: ChatOps commands and reconciliation
- ✅ **State Management**: Version-locked state tracking
- ✅ **Security**: Trusted actor gating and minimal permissions

## 📖 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Workflow](#workflow)
- [ChatOps Commands](#chatops-commands)
- [Merge Policies](#merge-policies)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [License](#license)

## ✨ Features

### Core Capabilities

1. **Automated Requirement Processing**
   - Submit requirements via GitHub Issues
   - Automatic generation of Chinese specification documents
   - Structured plan creation with task breakdown

2. **Intelligent Task Orchestration**
   - Serial task execution with dependency management
   - Automatic task assignment to GitHub Copilot
   - State tracking with version locking

3. **Risk-Based Merge Policies**
   - **L1 (Low Risk)**: Auto-merge for docs, tests, and allowlisted files
   - **L2 (Medium Risk)**: Command approval required (`/approve-task`)
   - **L3 (High Risk)**: Full PR review required for sensitive changes

4. **Failure Recovery**
   - ChatOps commands for manual control
   - Scheduled reconciliation (every 6 hours)
   - Automatic retry mechanisms

5. **Comprehensive Notifications**
   - GitHub comments at every state transition
   - Label-based visual status tracking
   - Check-runs for CI status

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Submits Issue                        │
│                    (Agent Request Template)                      │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    agent-intake.yml                              │
│  • Validates trusted actor                                       │
│  • Initializes state                                             │
│  • Assigns to Copilot for Spec generation                        │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Copilot Generates Spec PR                     │
│  • Chinese specification document                                │
│  • Includes: background, scope, acceptance criteria              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              User Reviews and Merges Spec PR                     │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    agent-pr-router.yml                           │
│  • Detects Spec PR merge                                         │
│  • Assigns to Copilot for Plan generation                        │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Copilot Generates Plan PR                     │
│  • YAML plan (machine-readable)                                  │
│  • Chinese markdown (human-readable)                             │
│  • Task breakdown with risk levels                               │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              User Reviews and Merges Plan PR                     │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  agent-task-creator.yml                          │
│  • Creates sub-issues for each task                              │
│  • Updates plan with issue numbers                               │
│  • Idempotent operation                                          │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  agent-task-dispatcher.yml                       │
│  • Assigns first task to Copilot                                 │
│  • Enforces serial execution                                     │
│  • Checks dependencies                                           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Copilot Generates Task PR                     │
│  • Implementation code                                           │
│  • Tests and documentation                                       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│          agent-ci.yml + agent-merge-policy.yml                   │
│  • Runs CI verification                                          │
│  • Evaluates merge policy (L1/L2/L3)                             │
│  • Auto-merges or waits for approval                             │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Task PR Merged                                │
│  • Dispatcher assigns next task                                  │
│  • Repeat until all tasks complete                               │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    All Tasks Complete                            │
│  • Parent issue marked as done                                   │
│  • Notification sent                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
.github/
├── agent/
│   └── config.yml                      # Main configuration
├── workflows/
│   ├── agent-bootstrap.yml             # Label initialization
│   ├── agent-intake.yml                # Issue intake
│   ├── agent-pr-router.yml             # PR routing
│   ├── agent-task-creator.yml          # Task creation
│   ├── agent-task-dispatcher.yml       # Task dispatch
│   ├── agent-ci.yml                    # CI verification
│   ├── agent-merge-policy.yml          # Merge policy
│   ├── agent-commands.yml              # ChatOps commands
│   └── agent-reconcile.yml             # Reconciliation
├── scripts/                            # External workflow scripts
│   ├── lib/                            # Shared libraries
│   │   ├── github-client.js            # GitHub API wrapper
│   │   ├── config-loader.js            # Configuration loader
│   │   ├── state-manager.js            # State management
│   │   └── utils.js                    # Utility functions
│   ├── package.json                    # Script dependencies
│   ├── dispatch-task.js                # Task dispatcher
│   ├── create-tasks.js                 # Task creation
│   ├── evaluate-merge-policy.js        # Merge policy evaluation
│   └── ... (16 more workflow scripts)
└── ISSUE_TEMPLATE/
    ├── config.yml
    └── agent-request.yml               # Requirement template

docs/agent/
├── CONFIG.md                           # Configuration guide
├── config.schema.json                  # Config validation
├── SPEC_TEMPLATE.md                    # Spec template (Chinese)
├── PLAN_TEMPLATE.md                    # Plan template (Chinese)
├── plan.schema.json                    # Plan validation
└── plan.example.yaml                   # Example plan

agent/
├── package.json                        # Node.js dependencies
├── tsconfig.json                       # TypeScript config
├── .eslintrc.json                      # ESLint config
└── src/
    └── state.ts                        # State management

plans/                                  # Generated plans (YAML + MD)
```

## 📦 Installation

### Prerequisites

1. **GitHub Copilot**
   - Enable GitHub Copilot for your repository
   - Ensure Copilot coding agent is available

2. **Repository Settings**
   - Enable Actions with read/write permissions
   - Enable auto-merge (optional, for L1 auto-merge)
   - Configure branch protection rules (optional)

3. **Fine-Grained Personal Access Token (PAT)**
   - Create a fine-grained PAT with the following permissions:
     - **Metadata**: Read (required)
     - **Issues**: Read and write
     - **Pull requests**: Read and write
     - **Contents**: Read and write
     - **Actions**: Read and write
     - **Checks**: Read and write

### Step-by-Step Installation

#### 1. Clone or Copy Files

Copy all files from this repository to your target repository:

```bash
# Clone this repository
git clone <this-repo-url>

# Copy to your target repository
cp -r .github /path/to/your/repo/
cp -r docs /path/to/your/repo/
cp -r agent /path/to/your/repo/
```

#### 2. Configure Secrets

Add the following secrets to your repository:

```bash
# Navigate to: Settings → Secrets and variables → Actions → New repository secret

# Required:
AGENT_GH_TOKEN=<your-fine-grained-pat>

# Optional (for webhook notifications):
AGENT_WEBHOOK_URL=<your-webhook-endpoint>
AGENT_WEBHOOK_SECRET=<your-webhook-secret>
```

#### 3. Install Dependencies

```bash
cd agent
npm install
```

#### 4. Bootstrap Labels

Run the bootstrap workflow to create all required labels:

```bash
# Using GitHub CLI
gh workflow run agent-bootstrap.yml

# Or manually trigger via GitHub UI:
# Actions → agent-bootstrap → Run workflow
```

#### 5. Verify Installation

Check that all labels were created:

```bash
gh label list
```

You should see all the agent labels listed below.

#### Label Reference

The agent uses the following labels to track state and workflow progress:

**Parent Issue Labels** (lifecycle states):

| Label | Color | Description |
|-------|-------|-------------|
| `agent:requested` | 🟢 Green | Requirement issue created, awaiting spec generation |
| `agent:spec-in-progress` | 🔵 Blue | Copilot is generating specification document |
| `agent:spec-approved` | 🟢 Green | Specification PR has been merged |
| `agent:plan-in-progress` | 🔵 Blue | Copilot is generating execution plan |
| `agent:plan-approved` | 🟢 Green | Plan PR has been merged |
| `agent:executing` | 🟡 Yellow | Tasks are being executed |
| `agent:done` | 🟢 Green | All tasks completed successfully |
| `agent:blocked` | 🔴 Red | Pipeline is blocked and requires intervention |
| `agent:paused` | 🟡 Yellow | Pipeline is paused via /pause command |

**Task Issue Labels** (task states):

| Label | Color | Description |
|-------|-------|-------------|
| `agent:task` | 🔵 Blue | Task issue (not a requirement) |
| `agent:pending` | ⚪ Gray | Task is waiting to be started |
| `agent:in-progress` | 🟡 Yellow | Task is currently being worked on |
| `agent:in-review` | 🔵 Blue | Task PR is awaiting review/merge |
| `agent:cancelled` | ⚫ Dark Gray | Task was cancelled |

**Risk Level Labels** (merge policy):

| Label | Color | Description |
|-------|-------|-------------|
| `agent:l1` | 🟣 Light Purple | Level 1: Auto-merge allowed (allowlist + CI green) |
| `agent:l2` | 🟣 Purple | Level 2: Requires /approve-task command + CI green |
| `agent:l3` | 🟣 Dark Purple | Level 3: Requires full PR review |

**PR Type Labels**:

| Label | Color | Description |
|-------|-------|-------------|
| `agent:spec-pr` | 🟠 Orange | Specification document PR |
| `agent:plan-pr` | 🟠 Orange | Plan document PR |
| `agent:task-pr` | 🟠 Orange | Task implementation PR |
| `agent:status-pr` | 🟠 Orange | Plan status update PR |

**Special Labels**:

| Label | Color | Description |
|-------|-------|-------------|
| `agent:probe` | ⚫ Dark Gray | Probe issue for prerequisite checks |

> **Note**: The bootstrap workflow automatically creates all these labels with the correct colors and descriptions. You can manually run it anytime to ensure all labels exist.

## ⚙️ Configuration

### Basic Configuration

Edit `.github/agent/config.yml` to customize the agent behavior:

```yaml
copilot:
  bot_assignee: "copilot-swe-agent[bot]"
  base_branch: "main"

paths:
  spec_dir: "docs/specs"
  plan_yaml_dir: "plans"
  plan_md_dir: "plans"

merge_policy:
  l1:
    allowlist_globs:
      - "docs/**"
      - "*.md"
      - "tests/**"
  sensitive_globs:
    - ".github/workflows/**"
    - "**/*.yml"
    - "package.json"

ci:
  commands:
    lint: "npm run lint"
    test: "npm test"

timeouts:
  spec_pr_minutes: 20
  plan_pr_minutes: 20
  task_pr_minutes: 45
  ci_minutes: 30
```

### Advanced Configuration

See [`docs/agent/CONFIG.md`](docs/agent/CONFIG.md) for detailed configuration options.

## 🚀 Usage

### Submitting a Requirement

1. **Create a New Issue**
   - Go to Issues → New Issue
   - Select "Agent Request" template

2. **Fill in the Form**
   - **Background**: Describe the context and motivation
   - **Scope**: What should be included/excluded
   - **Acceptance Criteria**: How to verify completion
   - **Constraints**: Any limitations or requirements

3. **Submit the Issue**
   - The agent will automatically:
     - Initialize state tracking
     - Assign to Copilot for Spec generation
     - Create a Spec PR within 20 minutes

### Reviewing Spec PR

1. **Wait for Spec PR**
   - Copilot will create a PR with Chinese specification
   - PR title: `[Spec] Issue #<number>: <description>`

2. **Review the Specification**
   - Check background and objectives
   - Verify scope boundaries
   - Validate acceptance criteria
   - Ensure risks are identified

3. **Merge the Spec PR**
   - Once approved, merge the PR
   - Agent will automatically generate Plan PR

### Reviewing Plan PR

1. **Wait for Plan PR**
   - Copilot will create a PR with YAML + Chinese markdown
   - PR title: `[Plan] Issue #<number>: <description>`

2. **Review the Plan**
   - Check task breakdown (3-8 tasks recommended)
   - Verify risk levels (L1/L2/L3)
   - Validate dependencies
   - Review acceptance criteria for each task

3. **Merge the Plan PR**
   - Once approved, merge the PR
   - Agent will automatically:
     - Create sub-issues for each task
     - Start dispatching tasks to Copilot

### Monitoring Execution

1. **Track Progress**
   - Parent issue shows current state
   - Task sub-issues show individual progress
   - Labels indicate status visually

2. **View State**
   - Check parent issue comments for state JSON
   - Shows current task, version, and status

3. **Monitor PRs**
   - Each task generates a PR
   - CI runs automatically
   - Merge policy evaluated

### Handling Task PRs

#### L1 Tasks (Auto-merge)
- CI runs automatically
- If all checks pass, PR merges automatically
- No manual action required

#### L2 Tasks (Command approval)
- CI runs automatically
- Wait for checks to pass
- Comment `/approve-task` to merge
- PR merges after approval

#### L3 Tasks (Full review)
- CI runs automatically
- Requires full PR review
- Follow your normal review process
- Merge when approved

## 🔄 Workflow

### Complete Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. User submits Issue (Agent Request template)                   │
│    • Background, scope, acceptance criteria                       │
│    • Marker: <!-- agent-request -->                               │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. agent-intake.yml triggers                                      │
│    • Validates: OWNER/MEMBER/COLLABORATOR only                    │
│    • Creates state comment (version 1)                            │
│    • Adds label: agent:spec-in-progress                           │
│    • Assigns to Copilot with custom instructions                  │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. Copilot generates Spec PR (within 20 min)                     │
│    • File: docs/specs/issue-<N>.md                                │
│    • Chinese specification document                               │
│    • Markers: Agent-Parent-Issue, Agent-Task-Id: spec             │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. User reviews and merges Spec PR                               │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 5. agent-pr-router.yml detects Spec merge                        │
│    • Updates labels: agent:spec-approved, agent:plan-in-progress  │
│    • Assigns to Copilot for Plan generation                       │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 6. Copilot generates Plan PR (within 20 min)                     │
│    • Files: plans/issue-<N>.yaml + plans/issue-<N>.md            │
│    • Task breakdown with levels and dependencies                  │
│    • Markers: Agent-Parent-Issue, Agent-Task-Id: plan             │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 7. User reviews and merges Plan PR                               │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 8. agent-task-creator.yml triggers                               │
│    • Reads plans/issue-<N>.yaml                                   │
│    • Creates sub-issue for each task (idempotent)                 │
│    • Updates plan with issue numbers                              │
│    • Creates status PR to persist changes                         │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 9. agent-task-dispatcher.yml triggers                            │
│    • Checks: only 1 task in-progress at a time                    │
│    • Validates dependencies satisfied                             │
│    • Assigns next pending task to Copilot                         │
│    • Updates state with cursor                                    │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 10. Copilot generates Task PR (within 45 min)                    │
│     • Implementation code                                         │
│     • Tests and documentation                                     │
│     • Markers: Agent-Parent-Issue, Agent-Task-Id: <task-id>       │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 11. agent-pr-router.yml detects Task PR                          │
│     • Triggers agent-ci.yml (workflow_dispatch)                   │
│     • Triggers agent-merge-policy.yml                             │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 12. agent-ci.yml runs                                             │
│     • Validates PR parameters                                     │
│     • Runs: npm run lint, npm test                                │
│     • Creates check-run: agent/ci                                 │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 13. agent-merge-policy.yml evaluates                             │
│     • Analyzes changed files                                      │
│     • Computes level: L1/L2/L3                                    │
│     • L1: Auto-merge if CI green                                  │
│     • L2: Wait for /approve-task                                  │
│     • L3: Wait for PR review                                      │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 14. Task PR merged                                                │
│     • agent-task-dispatcher.yml triggers again                    │
│     • Assigns next task to Copilot                                │
│     • Repeat steps 10-14 until all tasks done                     │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 15. All tasks complete                                            │
│     • Parent issue labeled: agent:done                            │
│     • Notification comment added                                  │
│     • Workflow complete                                           │
└──────────────────────────────────────────────────────────────────┘
```

## 💬 ChatOps Commands

Use these commands in issue or PR comments to control the agent:

### `/approve-task`

**Purpose**: Approve and merge an L2 task PR

**Usage**:
```
/approve-task
```

**Requirements**:
- Must be used on a PR (not an issue)
- PR must have `agent:l2` label
- CI checks must have passed
- User must be OWNER/MEMBER/COLLABORATOR

**Example**:
```
The changes look good to me. CI is green.

/approve-task
```

### `/pause`

**Purpose**: Pause task dispatch

**Usage**:
```
/pause
```

**Effect**:
- Adds `agent:paused` label to parent issue
- Stops dispatcher from assigning new tasks
- Current in-progress task continues

**Use Case**: Need to pause automation temporarily

### `/resume`

**Purpose**: Resume task dispatch

**Usage**:
```
/resume
```

**Effect**:
- Removes `agent:paused` label
- Triggers dispatcher to continue
- Assigns next pending task

**Use Case**: Resume after pause

### `/retry`

**Purpose**: Retry current task (future implementation)

**Usage**:
```
/retry
```

**Effect**:
- Re-assigns current task to Copilot
- Increments retry counter
- Max retries: 2 (configurable)

**Use Case**: Copilot failed to generate PR or PR has issues

### `/abort`

**Purpose**: Abort the entire pipeline

**Usage**:
```
/abort
```

**Effect**:
- Adds `agent:blocked` label
- Stops all task dispatch
- Preserves audit trail

**Use Case**: Need to stop automation completely

## 🔒 Merge Policies

### L1: Low Risk (Auto-merge)

**Criteria**:
- All changed files match allowlist patterns
- CI checks pass
- No sensitive files touched

**Allowlist Patterns** (default):
- `docs/**`
- `*.md`
- `tests/**`
- `**/*.test.js`
- `**/*.test.ts`
- `**/*.spec.js`
- `**/*.spec.ts`
- `plans/**`

**Behavior**:
- Automatically merges when CI is green
- No manual approval needed
- If auto-merge fails, downgrades to L2

**Example**:
```
Changed files:
✓ docs/api.md → docs/** (allowlist)
✓ README.md → *.md (allowlist)
✓ tests/unit.test.js → tests/** (allowlist)

Result: L1 - Auto-merge enabled
```

### L2: Medium Risk (Command approval)

**Criteria**:
- Contains files outside allowlist
- No sensitive files touched
- CI checks pass

**Behavior**:
- Waits for `/approve-task` command
- Requires OWNER/MEMBER/COLLABORATOR
- Merges after command received

**Example**:
```
Changed files:
✓ docs/api.md → docs/** (allowlist)
⚠️ src/utils.js → not in allowlist
✓ tests/utils.test.js → tests/** (allowlist)

Result: L2 - Requires /approve-task command
```

### L3: High Risk (Full review)

**Criteria**:
- Contains sensitive files
- OR more than 300 files changed
- Requires full PR review

**Sensitive Patterns** (default):
- `.github/workflows/**`
- `.github/actions/**`
- `**/*.yml`
- `**/*.yaml`
- `package.json`
- `package-lock.json`
- `Dockerfile`
- `.env*`
- `**/*secret*`
- `**/*credential*`
- `**/*token*`

**Behavior**:
- Requires full PR review approval
- Follows branch protection rules
- May require CODEOWNERS approval

**Example**:
```
Changed files:
✓ docs/api.md → docs/** (allowlist)
❌ .github/workflows/ci.yml → .github/workflows/** (sensitive)

Result: L3 - Full PR review required
```

### Policy Downgrade

If L1 auto-merge fails (e.g., auto-merge not enabled in repo):
- Automatically downgrades to L2
- Adds comment explaining the downgrade
- Updates labels accordingly

## 🔧 Troubleshooting

### Common Issues

#### 1. Copilot Not Generating PRs

**Symptoms**:
- No Spec/Plan/Task PR appears after 20+ minutes
- Parent issue stuck in `spec-in-progress` or `plan-in-progress`

**Solutions**:
- Verify GitHub Copilot is enabled for the repository
- Check `AGENT_GH_TOKEN` has correct permissions
- Verify token can assign issues to `copilot-swe-agent[bot]`
- Check workflow logs for API errors

**Debug**:
```bash
# Check if Copilot is assigned
gh issue view <issue-number>

# Check workflow runs
gh run list --workflow=agent-intake.yml
gh run view <run-id> --log
```

#### 2. CI Not Running

**Symptoms**:
- Task PR created but no CI check-run appears
- PR stuck without `agent/ci` check

**Solutions**:
- Verify Actions permissions are set to read/write
- Check `agent-ci.yml` workflow exists
- Verify `agent-pr-router.yml` triggers CI dispatch
- Check workflow logs for dispatch errors

**Debug**:
```bash
# Check CI workflow runs
gh run list --workflow=agent-ci.yml

# Check PR router logs
gh run list --workflow=agent-pr-router.yml
gh run view <run-id> --log
```

#### 3. Auto-merge Not Working (L1)

**Symptoms**:
- L1 PR has green CI but doesn't merge
- PR downgrades to L2

**Solutions**:
- Enable auto-merge in repository settings
- Check branch protection rules allow bot merges
- Verify `AGENT_GH_TOKEN` has merge permissions
- Review merge policy logs

**Debug**:
```bash
# Check merge policy logs
gh run list --workflow=agent-merge-policy.yml
gh run view <run-id> --log
```

#### 4. State Inconsistency

**Symptoms**:
- Plan shows task as `in-progress` but PR is merged
- Dispatcher not assigning next task

**Solutions**:
- Wait for reconciliation (runs every 6 hours)
- Manually trigger reconciliation:
  ```bash
  gh workflow run agent-reconcile.yml
  ```
- Check reconciliation logs

**Debug**:
```bash
# Trigger reconciliation manually
gh workflow run agent-reconcile.yml

# Check reconciliation logs
gh run list --workflow=agent-reconcile.yml
gh run view <run-id> --log
```

#### 5. Task Stuck in Pending

**Symptoms**:
- Task sub-issue created but never assigned to Copilot
- Dispatcher not running

**Solutions**:
- Check if parent issue is paused (`agent:paused` label)
- Verify dependencies are satisfied
- Check if another task is in-progress
- Manually trigger dispatcher:
  ```bash
  gh workflow run agent-task-dispatcher.yml -f parent_issue=<issue-number>
  ```

**Debug**:
```bash
# Check dispatcher logs
gh run list --workflow=agent-task-dispatcher.yml
gh run view <run-id> --log

# Check parent issue state
gh issue view <issue-number>
```

### Getting Help

1. **Check Workflow Logs**
   ```bash
   gh run list
   gh run view <run-id> --log
   ```

2. **Review State Comments**
   - Check parent issue for state JSON comments
   - Verify version numbers are incrementing

3. **Verify Configuration**
   ```bash
   cat .github/agent/config.yml
   ```

4. **Check Labels**
   ```bash
   gh label list | grep agent
   ```

5. **Review Documentation**
   - See `docs/agent/CONFIG.md` for configuration details
   - Check `.sisyphus/notepads/github-autonomous-agent/` for implementation notes

## 🔐 Security

### Security Features

1. **Trusted Actor Gating**
   - Only OWNER/MEMBER/COLLABORATOR can submit requirements
   - All commands validated against author association
   - External users cannot trigger workflows

2. **Sensitive Path Protection**
   - Workflows, configs, and secrets always require L3 review
   - Configurable sensitive patterns
   - Cannot be bypassed by L1/L2

3. **Minimal Permissions**
   - CI runs with read-only access
   - No secrets exposed to CI
   - Each workflow has minimal required permissions

4. **State Auditability**
   - All state changes tracked in issue comments
   - Version locking prevents race conditions
   - Complete audit trail

5. **Marker-Based Binding**
   - PRs bound to tasks via body markers
   - Prevents title-based spoofing
   - Validates parent issue and task ID

### Security Best Practices

1. **Token Management**
   - Use fine-grained PAT (not classic PAT)
   - Limit token scope to single repository
   - Rotate tokens regularly
   - Never commit tokens to repository

2. **Branch Protection**
   - Enable branch protection on main branch
   - Require PR reviews for sensitive changes
   - Enable status checks
   - Restrict who can push

3. **Workflow Security**
   - Review all workflow changes carefully
   - Never modify workflows via L1/L2 tasks
   - Use `pull_request` not `pull_request_target` for CI
   - Validate all inputs

4. **Copilot Output Review**
   - Always review Spec and Plan PRs
   - Verify task breakdown makes sense
   - Check for security issues in generated code
   - Test thoroughly before merging

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

For major changes, please open an issue first to discuss what you would like to change.

## 📚 Additional Resources

- [Configuration Guide](docs/agent/CONFIG.md)
- [Spec Template](docs/agent/SPEC_TEMPLATE.md)
- [Plan Template](docs/agent/PLAN_TEMPLATE.md)
- [Implementation Notes](.sisyphus/notepads/github-autonomous-agent/)

## 🙏 Acknowledgments

- GitHub Copilot team for the coding agent API
- GitHub Actions team for the workflow infrastructure
- All contributors to this project

---

**Status**: Production-ready | **Version**: 1.0.0 | **Last Updated**: 2025-02-02
