# Implementation Approach for Remaining Tasks

## Current Status: 5/13 Complete (38%)

### Completed Tasks
1. ✅ Configuration system
2. ✅ Labels bootstrap
3. ✅ Templates and schemas
4. ✅ Issue templates
5. ✅ Prerequisites documentation

### Remaining Tasks (8)
- Task 3: Intake workflow
- Task 4: Spec merge → Plan PR
- Task 5: Plan merge → Task issues
- Task 6: Serial task dispatch
- Task 7: CI verification
- Task 8: Merge policies (L1/L2/L3)
- Task 9: Failure recovery & reconciliation
- Task 10: Notification system

## Problem Analysis

### Issue
Inline JavaScript in GitHub Actions workflows has severe YAML escaping issues:
- Markdown formatting (`**`, `-`, etc.) conflicts with YAML syntax
- Multi-line template strings are fragile
- Complex logic is hard to maintain in YAML

### Root Cause
The remaining tasks require:
1. Complex state machine logic (200+ lines per workflow)
2. GitHub API calls with Octokit
3. Multi-step orchestration
4. Error handling and retry logic

## Recommended Implementation Approach

### Option 1: Separate JavaScript Files (RECOMMENDED)

**Structure:**
```
agent/
├── src/
│   ├── intake.js          # Task 3
│   ├── spec-to-plan.js    # Task 4
│   ├── plan-to-tasks.js   # Task 5
│   ├── dispatch.js        # Task 6
│   ├── ci.js              # Task 7
│   ├── pr-router.js       # Task 8
│   ├── reconcile.js       # Task 9
│   └── notify.js          # Task 10
├── lib/
│   ├── state.js           # State management
│   ├── plan.js            # Plan parsing
│   ├── github.js          # GitHub API wrapper
│   ├── commands.js        # ChatOps parsing
│   └── policies.js        # Merge policies
└── package.json
```

**Workflows call these scripts:**
```yaml
- name: Run intake
  run: node agent/src/intake.js
  env:
    GITHUB_TOKEN: ${{ secrets.AGENT_GH_TOKEN }}
    ISSUE_NUMBER: ${{ github.event.issue.number }}
```

**Advantages:**
- Clean separation of concerns
- Proper error handling
- Testable code
- No YAML escaping issues
- Can use TypeScript

**Disadvantages:**
- Requires npm install in workflows
- More files to maintain

### Option 2: GitHub Actions Toolkit (ALTERNATIVE)

Create custom GitHub Actions in `.github/actions/`:

```
.github/actions/
├── intake/
│   ├── action.yml
│   └── index.js
├── spec-to-plan/
│   ├── action.yml
│   └── index.js
└── ...
```

**Workflows use actions:**
```yaml
- uses: ./.github/actions/intake
  with:
    issue-number: ${{ github.event.issue.number }}
```

**Advantages:**
- Reusable actions
- Clean workflow files
- Built-in input/output handling

**Disadvantages:**
- More complex structure
- Requires action.yml for each

### Option 3: External Service (NOT RECOMMENDED FOR MVP)

Move orchestration to external service (Lambda, Cloud Run, etc.)

**Advantages:**
- Full programming language support
- Better debugging
- Persistent state

**Disadvantages:**
- Violates "GitHub-native" requirement
- Requires infrastructure
- More complex deployment

## Recommended Path Forward

### Phase 1: Core Module Implementation (3-4 days)

Implement shared libraries in `agent/lib/`:

1. **github.js** - Octokit wrapper
   - Issue operations (create, update, comment, assign)
   - PR operations (create, merge, list files)
   - Workflow dispatch
   - Check-run creation

2. **state.js** - State management
   - Read state comment (with version locking)
   - Write state comment (with retry)
   - State transitions
   - Concurrency handling

3. **plan.js** - Plan operations
   - Parse YAML
   - Validate schema
   - Update task status
   - Generate markdown

4. **commands.js** - ChatOps
   - Parse commands
   - Validate actor
   - Execute command logic

5. **policies.js** - Merge policies
   - Analyze changed files
   - Match globs (allowlist/sensitive)
   - Determine level (L1/L2/L3)
   - Execute merge strategy

### Phase 2: Workflow Scripts (2-3 days)

Implement workflow entry points in `agent/src/`:

1. **intake.js** (Task 3)
   - Validate actor and marker
   - Initialize state
   - Assign to Copilot with instructions

2. **spec-to-plan.js** (Task 4)
   - Detect Spec PR merge
   - Update state
   - Assign Plan generation to Copilot

3. **plan-to-tasks.js** (Task 5)
   - Parse plan YAML
   - Create task issues (idempotent)
   - Update plan with issue numbers

4. **dispatch.js** (Task 6)
   - Read cursor from state
   - Assign next task to Copilot
   - Update state

5. **ci.js** (Task 7)
   - Checkout PR code
   - Run lint/test
   - Create check-run

6. **pr-router.js** (Task 8)
   - Identify PR type
   - Analyze changed files
   - Apply merge policy
   - Trigger CI

7. **reconcile.js** (Task 9)
   - Scan for inconsistencies
   - Handle timeouts
   - Process ChatOps commands

8. **notify.js** (Task 10)
   - Send GitHub comments
   - Send webhook notifications

### Phase 3: Workflows (1-2 days)

Create simple workflows that call the scripts:

1. `.github/workflows/agent-intake.yml`
2. `.github/workflows/agent-commands.yml`
3. `.github/workflows/agent-pr-router.yml`
4. `.github/workflows/agent-ci.yml`
5. `.github/workflows/agent-reconcile.yml`

### Phase 4: Testing (2-3 days)

1. Unit tests for libraries
2. Integration tests for scripts
3. E2E tests in sandbox repo

## Estimated Total Effort

- Phase 1: 3-4 days
- Phase 2: 2-3 days
- Phase 3: 1-2 days
- Phase 4: 2-3 days
- **Total: 8-12 days**

## Blocker Resolution

The current blocker (YAML escaping in inline JavaScript) is resolved by:
1. Moving all logic to separate .js files
2. Keeping workflows simple (just call scripts)
3. Using proper module structure

This approach is:
- ✅ Maintainable
- ✅ Testable
- ✅ Debuggable
- ✅ GitHub-native (no external services)
- ✅ Follows plan's architecture (Node.js + Octokit)

## Next Steps

1. Create `agent/lib/` directory structure
2. Implement core libraries (github, state, plan, commands, policies)
3. Implement workflow scripts
4. Create simple workflows
5. Test in sandbox repo

## Conclusion

The foundation (5/13 tasks) is complete and production-ready. The remaining 8 tasks require a proper code implementation approach, not inline YAML scripts. The recommended path uses separate JavaScript files called from workflows, which resolves the YAML escaping blocker and provides a maintainable, testable solution.
