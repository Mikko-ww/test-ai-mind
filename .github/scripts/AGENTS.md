# TEMPLATE SCRIPTS

**Purpose:** GitHub Actions scripts distributed to target repositories (the "product")

## OVERVIEW

22 scripts + 4 lib modules. These are copied to target repos' `.github/scripts/` and executed by workflows.

## WHERE TO LOOK

| Script | Lines | Purpose |
|--------|-------|---------|
| `assign-to-copilot.js` | 197 | Assign task issues to GitHub Copilot |
| `bootstrap-labels.js` | 194 | Initialize agent labels on first run |
| `create-tasks.js` | 162 | Generate sub-task issues from plan |
| `dispatch-task.js` | 161 | Queue next task for execution |
| `create-status-pr.js` | 146 | Create status update PRs |
| `evaluate-merge-policy.js` | 131 | Determine L1/L2/L3 risk level |
| `handle-spec-merge.js` | 109 | Process spec PR merge |
| `reconcile-state.js` | 82 | Sync state (full preset only) |
| `lib/state-manager.js` | - | Comment-based state tracking |
| `lib/config-loader.js` | - | Load `.github/agent/config.yml` |
| `lib/github-client.js` | - | Octokit wrapper for workflows |
| `lib/utils.js` | - | Shared helpers |

## CONVENTIONS

- All scripts use `@actions/core` and `@actions/github`
- State stored in issue comments (DO NOT edit manually)
- Config loaded from `.github/agent/config.yml`
- Risk levels: L1 (auto-merge), L2 (command), L3 (manual)
- Use `lib/` modules for shared logic

## ANTI-PATTERNS

**Critical (from codebase):**
- **DO NOT** manually edit state comments (breaks state-manager)
- **NEVER** commit secrets (AGENT_GH_TOKEN, etc.)
- **ALWAYS** use workflow_dispatch for CI (not PR triggers)
- **NEVER** modify workflows via L1/L2 tasks (L3 only)

**Code:**
- Don't hardcode repo info (use context.repo)
- Don't skip error handling (workflows fail silently)
- Don't bypass state-manager (use lib functions)

## NOTES

- These files are the **product** - changes affect all users
- State tracking: JSON in issue comments with magic markers
- Merge policy: globs in config determine L1/L2/L3
- 26 scripts total (22 main + 4 lib)
- Largest: `assign-to-copilot.js` (197 lines)
- Used by 10 workflows (minimal: 6, standard: 9, full: 10)
