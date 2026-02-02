# Draft: GitHub Autonomous Agent

## Requirements (captured)
- Collect user requirements from GitHub (issue-based is preferred; could also be a repo listener).
- Generate a requirements document and submit it for user review/approval (ideally as a PR).
- After approval, generate an executable task list file (single source of truth in-repo).
- After a second approval, dispatch tasks sequentially to an implementation agent (user mentioned GitHub Copilot).
- After each task: update status, open PR, get approval/merge, then continue to next task.
- When all tasks complete: update overall status and notify the user.
- Tasks should have a "level" (risk/priority) that determines review/approval strictness; different levels use different merge/approval flows.
 - Task levels: 3 levels are sufficient; low-level should be as automated/lenient as possible.
- Plan/spec documents should be written in Chinese (not English).
 - Notification should be configurable: support GitHub comments/status + webhook (and allow future extensions).

## Requirements (confirmed)
- Hosting model: GitHub-native only (GitHub Actions-first; no external orchestrator for MVP).
- Approval gates: Use PR Review for both the requirements/spec artifact and the executable task list artifact.

## Technical Decisions
- Task Levels: 3 levels.
- Level 1 merge gate: "allowlist + CI green" (only allowlisted low-risk changes auto-merge when checks pass).
- Level 2 merge gate: requires explicit ChatOps command (e.g. PR comment `/approve-task`) after checks are green.
- Level 3 merge gate: full GitHub PR Review required (optionally with CODEOWNERS + higher approval count).
- Plan/spec language: Chinese.
- CI for Copilot PRs: design verification that runs automatically for `copilot/**` changes (with careful permission isolation and prompt-injection mitigation).
- Task list artifacts: maintain two files: a machine-readable YAML as source-of-truth + a Chinese Markdown reading version.
- Spec/Plan generation: use GitHub Copilot coding agent (issue assignment API) to author/update the files and open PRs.
- Task dispatch granularity: create one child Issue per task; sequentially assign each to `copilot-swe-agent[bot]`.
- Configuration: store non-secret settings in a repo config file; store secrets in GitHub Secrets/Variables.
- Verification: use a sandbox repo for end-to-end workflow validation + unit tests for parsers/state machine/security checks.

## Scope Boundaries (tentative)
- INCLUDE: GitHub issue intake, approval gates, task-plan artifact in repo, sequential execution + status transitions, notifications.
- EXCLUDE (for now): multi-repo orchestration, production secrets rotation, advanced RBAC beyond GitHub permissions.

## Open Questions
- Hosting model: GitHub-native only (Actions + GitHub App) vs allowing an external orchestrator service.
- “Copilot” integration: Copilot Coding Agent/Workspace vs alternative LLM-based PR bot if Copilot is not invokable by API.
- Approval mechanism: issue labels/comments commands vs PR review vs GitHub Environments.
- Notification channel: GitHub comments only vs Slack/Teams/Email/WeChat.
- Notification config location/format: repo file (recommended) vs org/repo variables/secrets only.
- Constraints: repo language(s), CI requirements, branch protections, security posture.
- Task level scheme: how many levels, criteria for each, and who is allowed to approve per level.

## Research Findings
- OpenHands provides a GitHub Action that can be triggered by an issue label (e.g. `fix-me`) or an issue comment mention (e.g. `@openhands-agent`) to attempt issue/PR resolution and open a PR; iterative follow-ups can be done by re-labeling the PR or commenting again. Source: https://docs.openhands.dev/openhands/usage/run-openhands/github-action and https://docs.all-hands.dev/usage/how-to/github-action
- Local repo currently has no `.github/workflows/*` (no GitHub Actions yet), no PR templates, no label conventions, and no existing Octokit/Probot/GitHub App integration code. This will be greenfield automation scaffolding.
- Local repo currently has no Copilot integration code; only the draft mentions Copilot conceptually.
- GitHub Copilot Coding Agent can be triggered programmatically by assigning an issue to `copilot-swe-agent[bot]` via REST/GraphQL; docs show optional `agent_assignment` customization. Sources:
  - https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/assign-copilot-to-an-issue
  - https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-a-pr
  - https://github.blog/changelog/2025-12-03-assign-issues-to-copilot-using-the-api/
- Copilot Coding Agent operational constraints to design around:
  - Only users with write access can trigger; comments from users without write access are not presented to the agent.
  - Copilot only pushes to branches prefixed `copilot/` (cannot push to main/master).
  - Workflows on Copilot PRs may require a human to click “Approve and run workflows” (limits full hands-off automation).
  - Copilot code review leaves “Comment” reviews only and does not satisfy required approvals.
- OpenHands workflow patterns worth borrowing:
  - Trigger via label OR comment macro; restrict triggers to trusted `author_association` (OWNER/COLLABORATOR/MEMBER).
  - Macro-driven ChatOps (e.g. `@openhands-agent`) and re-trigger via label on PR.

## Reusable Solutions / References (shortlist)
- OpenHands Resolver (GitHub Actions): label/comment macro triggers + trusted author gating; uses PAT for PR creation; good reference for end-to-end “issue/PR -> agent -> PR”.
- Aider GitHub Workflows/Action: issue label -> implement -> open PR; uploads chat history artifacts; simpler plumbing.
- PR-Agent (qodo-ai/pr-agent): strong PR comment workflow patterns + GitHub App security model; good for review/iteration, not full coding from scratch.
- SWE-agent: issue-driven code-fix agent; can be run in GHA with appropriate container/runtime.
- Patchwork / Sweep: alternative “issue -> PR” approaches (often need external service or app model).

## Decisions (pending to define)
- Define Level 1/2/3 policy (classification rules + merge gates + required checks).
