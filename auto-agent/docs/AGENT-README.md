# GitHub Autonomous Agent System

[简体中文](AGENT-README.zh-CN.md) | English

A GitHub-native autonomous agent that automates the Issue → Spec → Plan → Implementation workflow using GitHub Copilot.

## 🎯 What is This?

This is a **GitHub Autonomous Agent System** - an automation framework that uses GitHub Copilot to automatically handle development tasks from requirements to implementation. It transforms GitHub Issues into working code through a structured workflow.

## 🚀 Quick Start

### For Users: Install the CLI Tool

The easiest way to use this system is through the CLI tool:

```bash
# Navigate to your repository
cd /path/to/your/repo

# Initialize GitHub Agent
npx flowmind-cli init

# Set up GitHub repository
flowmind setup --token YOUR_GITHUB_TOKEN

# Validate installation
flowmind validate
```

See the [CLI Documentation](cli/README.md) for detailed usage.

### For Developers: Understanding the System

This repository contains:
- **`cli/`** - Command-line tool for easy installation
- **`.github/`** - GitHub Actions workflows and scripts
- **`agent/`** - Core agent logic and state management
- **`docs/`** - Documentation and templates

## 📖 Table of Contents

- [Features](#-features)
- [Architecture](#%EF%B8%8F-architecture)
- [Installation](#-installation)
- [Configuration](#%EF%B8%8F-configuration)
- [Usage Workflow](#-usage-workflow)
- [ChatOps Commands](#-chatops-commands)
- [Merge Policies](#-merge-policies)
- [Troubleshooting](#-troubleshooting)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

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
   - **L2 (Medium Risk)**: Command approval required (\`/approve-task\`)
   - **L3 (High Risk)**: Full PR review required for sensitive changes

4. **Failure Recovery**
   - ChatOps commands for manual control
   - Scheduled reconciliation (every 6 hours)
 atic retry mechanisms

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
│                      Creates Epic Issue (#100)                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    agent-intake.yml                              │
│  • Validates trusted actor                                       │
│  • Initializes state                                             │
│  • Creates Requirement Issue (#101)                              │
│  • Assigns to Copilot for Requirement generation                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Copilot Generates Requirement PR                    │
│  • Requirement document (📋)                                     │
│  • Links to Requirement Issue (#101)                             │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│         User Reviews and Merges Requirement PR                   │
│         Requirement Issue (#101) Closed                          │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Creates Spec Issue (#102)                           │
│              Copilot Generates Spec PR                           │
│  • Chinese specification document (📐)                           │
│  • Includes: background, scope, acceptance criteria              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              User Reviews and Merges Spec PR                     │
│              Spec Issue (#102) Closed                            │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              Creates Plan Issue (#103)                           │
│              Copilot Generates Plan PR                           │
│  • YAML plan (machine-readable) (🗺️)                            │
│  • Chinese markdown (human-readable)                             │
│  • Task breakdown with risk levels                               │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              User Reviews and Merges Plan PR                     │
│              Plan Issue (#103) Closed                            │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Task Creation & Execution                       │
│  • Creates sub-issues for each task (#104, #105...) (⚙️)        │
│  • Assigns tasks to Copilot serially                             │
│  • Generates implementation PRs                                  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│          CI Verification & Merge Policy Evaluation               │
│  • Runs automated tests                                          │
│  • Evaluates risk level (L1/L2/L3)                               │
│  • Auto-merges or waits for approval                             │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    All Tasks Complete                            │
│  • Epic Issue (#100) marked as done                              │
│  • Notification sent                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Phase-Based Workflow

The agent uses a phase-based architecture where each phase gets its own Issue:

**Phase Progression:**

1. **Epic Issue**: Parent container tracking overall progress
2. **Requirement Issue**: Generates requirement document (📋)
3. **Spec Issue**: Generates specification document (📐)
4. **Plan Issue**: Generates execution plan (🗺️)
5. **Task Issues**: Individual implementation tasks (⚙️)

Each Phase Issue is automatically created after the previous phase's PR is merged.
Phase Issues are closed (not reopened) when complete.

**Issue Hierarchy:**

```
Epic Issue (#100) [Parent Container]
  ├─ Requirement Issue (#101) → PR → Merge → Close
  ├─ Spec Issue (#102) → PR → Merge → Close
  ├─ Plan Issue (#103) → PR → Merge → Close
  └─ Task Issues (#104, #105...) [Existing logic]
```

## 📦 Installation

### Method 1: Using CLI Tool (Recommended)

The easiest way to install the GitHub Agent in your repository:

```bash
# Navigate to your repository
cd /path/to/your/repo

# Initialize GitHub Agent
npx flowmind-cli init

# Set up GitHub repository
flowmind setup --token YOUR_GITHUB_TOKEN

# Validate installation
flowmind validate
```

See [CLI Documentation](cli/README.md) for more options.

### Method 2: Manual Installation

If you prefer manual installation, see the full documentation for detailed steps including:
- Prerequisites (GitHub Copilot, repository settings, PAT)
- File copying and configuration
- Dependency installation
- Label bootstrapping

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

See [`auto-agent/docs/CONFIG.md`](auto-agent/docs/CONFIG.md) for detailed configuration options.

## 🔄 Usage Workflow

### Step 1: Submit a Requirement

1. Navigate to the **Issues** tab in your repository
2. Click **New Issue** and select the **Agent Request** template
3. Fill in the detailed requirements:
   - **Background**: Why is this needed?
   - **Scope**: What is in scope and out of scope?
   - **Acceptance Criteria**: How do we know it's done?
4. Click **Submit New Issue**

> **Result**: The agent creates an Epic Issue and a Requirement Issue, assigns Copilot to generate the requirement document.

### Step 2: Review Requirement

1. Wait approx. **20 minutes**. Copilot will create a Pull Request (PR) titled `[Requirement] Issue #<id>...`
2. Review the generated **Requirement Document**
3. **Action**:
   - If correct: **Merge** the PR
   - If changes needed: Comment on the PR or edit the file directly, then merge

> **Result**: Merging the Requirement PR closes the Requirement Issue and creates a new Spec Issue.

### Step 3: Review Specification

1. Wait approx. **20 minutes**. Copilot will create a Pull Request (PR) titled `[Spec] Issue #<id>...`
2. Review the generated **Chinese Specification Document** (`docs/specs/issue-<id>.md`)
3. **Action**:
   - If correct: *he PR
   - If changes needed: Comment on the PR or edit the file directly, then merge

> **Result**: Merging the Spec PR closes the Spec Issue and creates a new Plan Issue.

### Step 4: Review Plan

1. Wait approx. **20 minutes**. Copilot will create a PR titled `[Plan] Issue #<id>...`
2. Review the **Plan** files (`plans/issue-<id>.yaml` and `.md`)
   - Check the task breakdown
   - Check risk levels (L1/L2/L3)
3. **Action**: **Merge** the PR if the plan looks good

> **Result**: Merging the Plan PR closes the Plan Issue and triggers the creation of sub-issues for each task.

### Step 5: Monitor Execution

The agent executes tasks **serially** (one by one).

1. Go to the **Epic Issue**. You will see a comment with the current status (JSON)
2. Look for sub-issues created by the agent (e.g., `Task 1: ...`)
3. The agent acts on these sub-issues to generate implementation code

### Step 6: Review & Merge Tasks

Copilot will open a PR for each task. The merging process depends on the **Risk Level**:

#### 🟢 L1: Low Risk (Auto-merge)
- **Criteria**: Only touches docs, tests, or allowlisted files
- **Action**: No action needed. Automatically merges if CI passes

#### 🟡 L2: Medium Risk (Command Approval)
- **Criteria**: Touches logic code but no sensitive files
- **Action**:
  1. Wait for CI checks to pass (Green)
  2. Comment **/approve-task** on the PR
  3. The agent will merge the PR

#### 🔴 L3: High Risk (Manual Review)
- **Criteria**: Touches workflows, secrets, or large changes (>300 files)
- **Action**: Requires a full human review and manual approval via GitHub UI

## 💬 ChatOps Commands

Use these comman comments on Issues or PRs.

| Command | Context | Description |
| :--- | :--- | :--- |
| `/approve-task` | **PR only** | Approves and merges an L2 task (requires passing CI) |
| `/pause` | **Issue/PR** | Pauses the automated dispatcher |
| `/resume` | **Issue/PR** | Resumes the dispatcher after a pause |
| `/abort` | **Issue/PR** | Stops the entire workflow permanently |
| `/retry` | **Phase Issue** | Retry failed phase (max 3 attempts) |
| `/skip-phase` | **Phase Issue** | Skip current phase and move to next |
| `/cancel-phase` | **Phase Issue** | Cancel current phase |
| `/reopen` | **Phase Issue** | Reopen accidentally closed Phase Issue lp` | **Issue/PR** | Shows help message |

### Command Details

#### `/approve-task`

**Purpose**: Approve and merge an L2 task PR

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

#### `/pause`

**Purpose**: Pause task dispatch

**Effect**:
- Adds `agent:paused` label to Epic Issue
- Stops dispatcher from assigning new tasks
- Current in-progress task continues

#### `/resume`

**Purpose**: Resume task dispatch after pause

**Effect**:
- Removes `agent:paused` label
- Triggers dispatcher to continue
- Assigns next pending task

#### `/abort`

**Purpose**: Abort the entire pipeline

**Effect**:
- Adds `agent:blocked` label
- Stops all task dispatch
- Preserves audit trail

#### `/retry`

**Purpose**: Retry a failed phase

**Requirements**:
- Must be used on a Phase Issue (Requirement/Spec/Plan)
- Phase must have failed
- Maximum 3 retry attempts allowed

**Effect**:
- Increments retry counter
- Reassigns Phase Issue to Copilot
- Restarts phase generation

**Example**:
```
The spec generation failed due to timeout. Let's try again.

/retry
```

#### `/skip-phase`

**Purpose**: Skip the current phase and move to the next

**Requirements**:
- Must be used on a Phase Issue
- User must be OWNER/MEMBER/COLLABORATOR

**Effect**:
- Closes current Phase Issue
- Creates next Phase Issue
- Updates Epic Issue state

**Example**:
```
We already have a spec document. Let's skip this phase.

/skip-phase
```

#### `/cancel-phase`

**Purpose**: Cancel the current phase without proceeding

**Requirements**:
- Must be used on a Phase Issue
- User must be OWNER/MEMBER/COLLABORATOR

**Effect**:
- Closes current Phase Issue
- Adds `agent:cancelled` label
- Does not create next phase

**Example**:
```
This approach won't work. Cancelling this phase.

/cancel-phase
```

#### `/reopen`

**Purpose**: Reopen an accidentally closed Phase Issue

**Requirements**:
- Must be used on a closed Phase Issue
- Phase must not be completed (no merged PR)
- User must be OWNER/MEMBER/COLLABORATOR

**Effect**:
- Reopens the Phase Issue
- Restores previous state
- Allows phase to continue

**Example**:
```
Accidentally closed this issue. Reopening.

/reopen
```

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

### L2: Medium Risk (Command approval)

**Criteria**:
- Contains files outside allowlist
- No sensitive files touched
- CI checks pass

**Behavior**:
- Waits for `/approve-task` command
- Requires OWNER/MEMBER/COLLABORATOR
- Merges after command received

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

## 🔧 Troubleshooting

### Common Issues

#### 1. Copilot Not Generating PRs

**Symptoms**:
- No Requirement/Spec/Plan/Task PR appears after 20+ minutes
- Phase Issue stuck without PR

**Solutions**:
- Verify GitHub Copilot is enabled for the repository
- Check `AGENT_GH_TOKEN` has correct permissions
- Verify token can assign issues to `copilot-swe-agent[bot]`
- Check workflow logs for API errors
- Try using `/retry` command on the Phase Issue

**Debug**:
```bash
# Check if Copilot is assigned
gh issue view <issue-number>

# Check workflow runs
gh run list --workflow=agent-intake.yml
gh run view <run-id> --log
```

#### 2. ot Running

**Symptoms**:
- Task PR created but no CI check-run appears
- PR stuck without `agent/ci` check

**Solutions**:
- Verify Actions permissions are set to read/write
- Check `agent-ci.yml` workflow exists
- Verify `agent-pr-router.yml` triggers CI dispatch
- Check workflow logs for dispatch errors

#### 3. Auto-merge Not Working (L1)

**Symptoms**:
- L1 PR has green CI but doesn't merge
- PR downgrades to L2

**Solutions**:
- Enable auto-merge in repository settings
- Check branch protection rules allow bot merges
- Verify `AGENT_GH_TOKEN` has merge permissions
- Review merge policy logs

#### 4. State Inconsistn
**Symptoms**:
- Epic Issue shows incorrect phase state
- Phase Issue not created after previous phase merged
- Dispatcher not assigning next task

**Solutions**:
- Check that Phase Issue PRs were properly merged
- Verify Phase Issues are closed after PR merge
- Wait for reconciliation (runs every 6 hours)
- Manually trigger reconciliation:
  ```bash
  gh workflow run agent-reconcile.yml
  ```

#### 5. Task Stuck in Pending

**Symptoms**:
- Task sub-issue created but never assigned to Copilot
- Dispatcher not running

**Solutions**:
- Check if Epic Issue is paused (`agent:paused` label)
- Verify dependencies are satisfied
- Check if another task is in-progress
- Manually trigger dispatcher:
  ```bash
  gh workflow run agent-task-dispatcher.yml -f parent_issue=<issue-number>
  ```

#### 6. Phase Issue Accidentally Closed

**Symptoms**:
- Phase Issue closed before PR was merged
- Workflow stuck waiting for phase completion

**Solutions**:
- Use `/reopen` command on the closed Phase Issue
- Verify the Phase Issue reopens successfully
- Wait for Copilot to generate the PR again

### Getting Help

1. **Check Workflow Logs**
   ```bash
   gh run list
   gh run view <run-id> --log
   ```

2. **Review State Comments**
   - Check Epic Issue for state JSON comments
   - Check Phase Issues for phascific state
   - Verify version numbers are incrementing

3. **Verify Configuration**
   ```bash
   cat .github/agent/config.yml
   ```

4. **Validate Setup**
   ```bash
   flowmind validate --token YOUR_TOKEN
   ```

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
   - Use \`pull_request\` not \`pull_request_target\` for CI
   - Validate all inputs

4. **Copilot Output Review**
   - Always review Spec and Plan PRs
   - Verify task breakdown makes sense
   - Check for security issues in generated code
   - Test thoroughly before merging

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 📚 Additional Resources

- [CLI Documentation](cli/README.md)
- [Configuration Guide](auto-agent/docs/CONFIG.md)
- [Spec Template](auto-agent/docs/SPEC_TEMPLATE.md)
- [Plan Template](auto-agent/docs/PLAN_TEMPLATE.md)

## 🙏 Acknowledgments

- GitHub Copilot team for the coding agent API
- GitHub Actions team for the workflow infrastructure
- All contributors to this project

---

**Status**: Production-ready | **Version**: 1.0.0 | **Last Updated**: 2025-02-03
