# User Guide

This guide provides step-by-step instructions on how to use the GitHub Autonomous Agent System to automate your development workflow.

[简体中文](USAGE.zh-CN.md) | English

---

## 📋 Prerequisites

Before starting, ensure you have the following permissions and setup:

1.  **Access**: You must be an **OWNER**, **MEMBER**, or **COLLABORATOR** of the repository.
2.  **Copilot**: GitHub Copilot must be enabled for the repository.
3.  **Labels**: Ensure the agent labels (e.g., `agent:requested`, `agent:l1`) exist.

---

## 🚀 Workflow

The workflow consists of 5 main steps: Issue → Spec → Plan → Implementation → Completion.

### Step 1: Submit a Requirement

1.  Navigate to the **Issues** tab in your repository.
2.  Click **New Issue** and select the **Agent Request** template.
3.  Fill in the detailed requirements:
    *   **Background**: Why is this needed?
    *   **Scope**: What is in scope and out of scope?
    *   **Acceptance Criteria**: How do we know it's done?
4.  Click **Submit New Issue**.

> **Result**: The agent will pick up the issue, tag it `agent:spec-in-progress`, and assign Copilot to write the specification.

### Step 2: Review Specification

1.  Wait approx. **20 minutes**. Copilot will create a Pull Request (PR) titled `[Spec] Issue #<id>...`.
2.  Review the generated **Chinese Specification Document** (`docs/specs/issue-<id>.md`).
3.  **Action**:
    *   If correct: **Merge** the PR.
    *   If changes needed: Comment on the PR or edit the file directly, then Merge.

> **Result**: Merging the Spec PR triggers the Plan generation phase (`agent:plan-in-progress`).

### Step 3: Review Plan

1.  Wait approx. **20 minutes**. Copilot will create a PR titled `[Plan] Issue #<id>...`.
2.  Review the **Plan** files (`plans/issue-<id>.yaml` and `.md`).
    *   Check the task breakdown.
    *   Check risk levels (L1/L2/L3).
3.  **Action**: **Merge** the PR if the plan looks good.

> **Result**: Merging the Plan PR triggers the creation of sub-issues for each task and starts execution.

### Step 4: Monitor Execution

The agent executes tasks **serially** (one by one).

1.  Go to the **Parent Issue**. You will see a comment with the current status (JSON).
2.  Look for sub-issues created by the agent (e.g., `Task 1: ...`).
3.  The agent acts on these sub-issues to generate implementation code.

### Step 5: Review & Merge Tasks

Copilot will open a PR for each task. The merging process depends on the **Risk Level**:

#### 🟢 L1: Low Risk (Auto-merge)
*   **Criteria**: Only touches docs, tests, or allowlisted files.
*   **Action**: No action needed. Automatically merges if CI passes.

#### 🟡 L2: Medium Risk (Command Approval)
*   **Criteria**: touches logic code but no sensitive files.
*   **Action**:
    1.  Wait for CI checks to pass (Green).
    2.  Comment **/approve-task** on the PR.
    3.  The agent will merge the PR.

#### 🔴 L3: High Risk (Manual Review)
*   **Criteria**: Touches workflows, secrets, or large changes (>300 files).
*   **Action**: Requires a full human review and manual approval via GitHub UI.

---

## 💬 ChatOps Commands

Use these commands in comments on Issues or PRs.

| Command | Context | Description |
| :--- | :--- | :--- |
| `/approve-task` | **PR only** | Approves and merges an L2 task (requires passing CI). |
| `/pause` | **Issue/PR** | Pauses the automated dispatcher. |
| `/resume` | **Issue/PR** | Resumes the dispatcher after a pause. |
| `/abort` | **Issue/PR** | Stops the entire workflow permanently. |
| `/help` | **Issue/PR** | Shows help message. |

---

## ❓ Troubleshooting

*   **Stuck?**
    *   Check if the **CI** failed on a PR. Fix the code and push, or wait for the agent to retry (if supported).
    *   Check if the Parent Issue is **paused** (`agent:paused`). Use `/resume`.
*   **No PR created?**
    *   Wait at least **20-30 minutes**. Copilot takes time to generate code.
    *   Check GitHub Actions tab for workflow failures.