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

# Initialize GitHub Agent (one command!)
npx github-agent-cli init

# Set up GitHub repository (labels, permissions)
github-agent setup --token YOUR_GITHUB_TOKEN

# You're ready to go!
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

\`\`\`
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
│                  Task Creation & Execution                       │
│  • Creates sub-issues for each task                              │
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
│  • Parent issue marked as done                                   │
│  • Notification sent                                             │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### Directory Structure

\`\`\`
.
├── cli/                                # CLI tool for easy installation
│   ├── bin/cli.js                      # Executable entry point
│   ├── src/                            # CLI source code
│   │   ├── commands/                   # Command implementations
│   │   ├── utils/                      # Utility modules
│   │   └── templates/                  # Template files
│   └── package.json
│
├── .github/
│   ├── agent/
│   │   └── config.yml                  # Main configuration
│   ├── workflows/
│   │   ├── agent-bootstrap.yml         # Label initialization
│   │   ├── agent-intake.yml            # Issue intake
│   │   ├── agent-pr-router.yml         # PR routing
│   │   ├── agent-task-creator.yml      # Task creation
│   │   ├── agent-task-dispatcher.yml   # Task dispatch
│   │   ├── agent-ci.yml                # CI verification
│   │   ├── agent-merge-policy.yml      # Merge policy
│   │   ├── agent-commands.yml          # ChatOps commands
│   │   └── agent-reconcile.yml         # Reconciliation
│   ├── scripts/                        # External workflow scripts
│   │   ├── lib/                        # Shared libraries
│   │   │   ├── github-client.js        # GitHub API wrapper
│   │   │   ├── config-loader.js        # Configuration loader
│   │   │   ├── state-manager.js        # State management
│   │   │   └── utils.js                # Utility functions
│   │   └── *.js                        # Workflow scripts
│   └── ISSUE_TEMPLATE/
│       └── agent-request.yml           # Requirement template
│
├── auto-agent/docs/
│   ├── CONFIG.md                       # Configuration guide
│   ├── config.schema.json              # Config validation
│   ├── SPEC_TEMPLATE.md                # Spec template (Chinese)
│   ├── PLAN_TEMPLATE.md                # Plan template (Chinese)
│   ├── plan.schema.json                # Plan validation
│   ├── plan.example.yaml               # Example plan
│   ├── AGENT-README.md                 # Agent documentation (English)
│   └── AGENT-README.zh-CN.md           # Agent documentation (Chinese)
│
├── agent/
│   ├── package.json                    # Node.js dependencies
│   ├── tsconfig.json                   # TypeScript config
│   └── src/
│       └── state.ts                    # State management
│
└── plans/                              # Generated plans (YAML + MD)
\`\`\`

## 📦 Installation

### Method 1: Using CLI Tool (Recommended)

The easiest way to install the GitHub Agent in your repository:

\`\`\`bash
# Navigate to your repository
cd /path/to/your/repo

# Initialize GitHub Agent
npx github-agent-cli init

# Set up GitHub repository
github-agent setup --token YOUR_GITHUB_TOKEN

# Validate installation
github-agent validate
\`\`\`

See [CLI Documentation](cli/README.md) for more options.

### Method 2: Manual Installation

If you prefer manual installation:

#### Prerequisites

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

#### Installation Steps

1. **Clone or Copy Files**

\`\`\`bash
# Clone this repository
git clone <this-repo-url>

# Copy to your target repository
cp -r .github /path/to/your/repo/
cp -r docs /path/to/your/repo/
cp -r agent /path/to/your/repo/
\`\`\`

2. **Configure Secrets**

Add the following secrets to your repository:

\`\`\`bash
# Navigate to: Settings → Secrets and variables → Actions → New repository secret

# Required:
AGENT_GH_TOKEN=<your-fine-grained-pat>

# Optional (for webhook notifications):
AGENT_WEBHOOK_URL=<your-webhook-endpoint>
AGENT_WEBHOOK_SECRET=<your-webhook-secret>
\`\`\`

3. **Install Dependencies**

\`\`\`bash
cd agent
npm install
\`\`\`

4. **Bootstrap Labels**

Run the bootstrap workflow to create all required labels:

\`\`\`bash
# Using GitHub CLI
gh workflow run agent-bootstrap.yml

# Or manually trigger via GitHub UI:
# Actions → agent-bootstrap → Run workflow
\`\`\`

5. **Verify Installation**

Check that all labels were created:

\`\`\`bash
gh label list | grep agent
\`\`\`

## ⚙️ Configuration

### Basic Configuration

Edit \`.github/agent/config.yml\` to customize the agent behavior:

\`\`\`yaml
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
\`\`\`

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

> **Result**: The agent will pick up the issue, tag it \`agent:spec-in-progress\`, and assign Copilot to write the specification.

### Step 2: Review Specification

1. Wait approx. **20 minutes**. Copilot will create a Pull Request (PR) titled \`[Spec] Issue #<id>...\`
2. Review the generated **Chinese Specification Document** (\`docs/specs/issue-<id>.md\`)
3. **Action**:
   - If correct: **Merge** the PR
   - If changes needed: Comment on the PR or edit the file directly, then merge

> **Result**: Merging the Spec PR triggers the Plan generation phase (\`agent:plan-in-progress\`).

### Step 3: Review Plan

1. Wait approx. **20 minutes**. Copilot will create a PR titled \`[Plan] Issue #<id>...\`
2. Review the **Plan** files (\`plans/issue-<id>.yaml\` and \`.md\`)
   - Check the task breakdown
   - Check risk levels (L1/L2/L3)
3. **Action**: **Merge** the PR if the plan looks good

> **Result**: Merging the Plan PR triggers the creation of sub-issues for each task and starts execution.

### Step 4: Monitor Execution

The agent executes tasks **serially** (one by one).

1. Go to the **Parent Issue**. You will see a comment with the current status (JSON)
2. Look for sub-issues created by the agent (e.g., \`Task 1: ...\`)
3. The agent acts on these sub-issues to generate implementation code

### Step 5: Review & Merge Tasks

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

Use these commands in comments on Issues or PRs.

| Command | Context | Description |
| :--- | :--- | :--- |
| \`/approve-task\` | **PR only** | Approves and merges an L2 task (requires passing CI) |
| \`/pause\` | **Issue/PR** | Pauses the automated dispatcher |
| \`/resume\` | **Issue/PR** | Resumes the dispatcher after a pause |
| \`/abort\` | **Issue/PR** | Stops the entire workflow permanently |
| \`/help\` | **Issue/PR** | Shows help message |

### Command Details

#### \`/approve-task\`

**Purpose**: Approve and merge an L2 task PR

**Requirements**:
- Must be used on a PR (not an issue)
- PR must have \`agent:l2\` label
- CI checks must have passed
- User must be OWNER/MEMBER/COLLABORATOR

**Example**:
\`\`\`
The changes look good to me. CI is green.

/approve-task
\`\`\`

#### \`/pause\`

**Purpose**: Pause task dispatch

**Effect**:
- Adds \`agent:paused\` label to parent issue
- Stops dispatcher from assigning new tasks
- Current in-progress task continues

#### \`/resume\`

**Purpose**: Resume task dispatch after pause

**Effect**:
- Removes \`agent:paused\` label
- Triggers dispatcher to continue
- Assigns next pending task

#### \`/abort\`

**Purpose**: Abort the entire pipeline

**Effect**:
- Adds \`agent:blocked\` label
- Stops all task dispatch
- Preserves audit trail

## 🔒 Merge Policies

### L1: Low Risk (Auto-merge)

**Criteria**:
- All changed files match allowlist patterns
- CI checks pass
- No sensitive files touched

**Allowlist Patterns** (default):
- \`docs/**\`
- \`*.md\`
- \`tests/**\`
- \`**/*.test.js\`
- \`**/*.test.ts\`
- \`**/*.spec.js\`
- \`**/*.spec.ts\`
- \`plans/**\`

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
- Waits for \`/approve-task\` command
- Requires OWNER/MEMBER/COLLABORATOR
- Merges after command received

### L3: High Risk (Full review)

**Criteria**:
- Contains sensitive files
- OR more than 300 files changed
- Requires full PR review

**Sensitive Patterns** (default):
- \`.github/workflows/**\`
- \`.github/actions/**\`
- \`**/*.yml\`
- \`**/*.yaml\`
- \`package.json\`
- \`package-lock.json\`
- \`Dockerfile\`
- \`.env*\`
- \`**/*secret*\`
- \`**/*credential*\`
- \`**/*token*\`

**Behavior**:
- Requires full PR review approval
- Follows branch protection rules
- May require CODEOWNERS approval

## 🔧 Troubleshooting

### Common Issues

#### 1. Copilot Not Generating PRs

**Symptoms**:
- No Spec/Plan/Task PR appears after 20+ minutes
- Parent issue stuck in \`spec-in-progress\` or \`plan-in-progress\`

**Solutions**:
- Verify GitHub Copilot is enabled for the repository
- Check \`AGENT_GH_TOKEN\` has correct permissions
- Verify token can assign issues to \`copilot-swe-agent[bot]\`
- Check workflow logs for API errors

**Debug**:
\`\`\`bash
# Check if Copilot is assigned
gh issue view <issue-number>

# Check workflow runs
gh run list --workflow=agent-intake.yml
gh run view <run-id> --log
\`\`\`

#### 2. CI Not Running

**Symptoms**:
- Task PR created but no CI check-run appears
- PR stuck without \`agent/ci\` check

**Solutions**:
- Verify Actions permissions are set to read/write
- Check \`agent-ci.yml\` workflow exists
- Verify \`agent-pr-router.yml\` triggers CI dispatch
- Check workflow logs for dispatch errors

#### 3. Auto-merge Not Working (L1)

**Symptoms**:
- L1 PR has green CI but doesn't merge
- PR downgrades to L2

**Solutions**:
- Enable auto-merge in repository settings
- Check branch protection rules allow bot merges
- Verify \`AGENT_GH_TOKEN\` has merge permissions
- Review merge policy logs

#### 4. State Inconsistency

**Symptoms**:
- Plan shows task as \`in-progress\` but PR is merged
- Dispatcher not assigning next task

**Solutions**:
- Wait for reconciliation (runs every 6 hours)
- Manually trigger reconciliation:
  \`\`\`bash
  gh workflow run agent-reconcile.yml
  \`\`\`

#### 5. Task Stuck in Pending

**Symptoms**:
- Task sub-issue created but never assigned to Copilot
- Dispatcher not running

**Solutions**:
- Check if parent issue is paused (\`agent:paused\` label)
- Verify dependencies are satisfied
- Check if another task is in-progress
- Manually trigger dispatcher:
  \`\`\`bash
  gh workflow run agent-task-dispatcher.yml -f parent_issue=<issue-number>
  \`\`\`

### Getting Help

1. **Check Workflow Logs**
   \`\`\`bash
   gh run list
   gh run view <run-id> --log
   \`\`\`

2. **Review State Comments**
   - Check parent issue for state JSON comments
   - Verify version numbers are incrementing

3. **Verify Configuration**
   \`\`\`bash
   cat .github/agent/config.yml
   \`\`\`

4. **Validate Setup**
   \`\`\`bash
   github-agent validate --token YOUR_TOKEN
   \`\`\`

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
