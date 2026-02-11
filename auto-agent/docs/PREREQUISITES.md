# Prerequisites for GitHub Autonomous Agent

This document lists the prerequisites and setup requirements for the GitHub Autonomous Agent system.

## Required GitHub Features

### 1. GitHub Copilot

**Requirement**: GitHub Copilot must be enabled for the repository.

**How to check**:
```bash
# Try to assign an issue to Copilot
gh api repos/{owner}/{repo}/issues/{issue_number} \
  -X PATCH \
  -f assignees[]=copilot-swe-agent[bot]
```

**Expected result**: 
- Success (200): Copilot is available
- 422 Unprocessable Entity: Copilot not enabled or not available for this repo

**How to enable**:
- For organization repos: Admin must enable Copilot in organization settings
- For private repos: Ensure Copilot license covers private repositories
- Check: Settings → Copilot → Enable for this repository

### 2. Auto-Merge (for L1 automatic merging)

**Requirement**: Repository must have auto-merge enabled.

**How to check**:
```bash
gh api repos/{owner}/{repo} --jq '.allow_auto_merge'
```

**Expected result**: `true`

**How to enable**:
- Go to Settings → General → Pull Requests
- Check "Allow auto-merge"

**Note**: If auto-merge is not enabled, L1 PRs will automatically downgrade to L2 (requiring `/approve-task` command).

### 3. GitHub Actions Permissions

**Requirement**: Actions must have write permissions for issues, PRs, and contents.

**How to check**:
- Go to Settings → Actions → General → Workflow permissions

**Required settings**:
- Workflow permissions: "Read and write permissions"
- OR: Use fine-grained permissions per workflow

**Workflows need**:
- `agent-bootstrap.yml`: issues: write
- `agent-intake.yml`: issues: write, contents: read
- `agent-commands.yml`: issues: write, pull-requests: write
- `agent-pr-router.yml`: issues: write, pull-requests: write, contents: write, checks: write
- `agent-ci.yml`: contents: read, checks: write
- `agent-reconcile.yml`: issues: write, pull-requests: read

## Required Secrets

### 1. AGENT_GH_TOKEN (Required)

**Type**: Fine-grained Personal Access Token (PAT)

**Owner**: A user with write/maintain access to the repository

**Required permissions** (for the target repository):
- **Metadata**: Read (required by GitHub)
- **Issues**nd write
- **Pull requests**: Read and write
- **Contents**: Read and write
- **Actions**: Read and write (for workflow_dispatch)
- **Checks**: Read and write (for check-run creation)

**How to create**:
1. Go to Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Set token name: "GitHub Agent Token"
4. Set expiration (recommend: 90 days with renewal reminder)
5. Select repository access: "Only select repositories" → Choose your repo
6. Set permissions as listed above
7. Generate token and copy it

**How to add to repository**:
```bash
gh secret set AGENT_GH_TOKEN
# Paste the token when prompted
```

**Why needed**:
- GitHub Copilot assignment requires user token (not GITHUB_TOKEN)
- Creating PRs, merging, and workflow dispatch require elevated permissions

### 2. AGENT_WEBHOOK_URL (Optional)

**Type**: String (URL)

**Purpose**: External webhook endpoint for notifications

**How to add**:
```bash
gh secret set AGENT_WEBHOOK_URL
# Enter your webhook URL
```

### 3. AGENT_WEBHOOK_SECRET (Optional)

**Type**: String (signing key)

**Purpose**: HMAC signature for webhook security

**How to generate**:
```bash
# Generate a random secret
openssl rand -hex 32
```

**How to add**:
```bash
gh secret set AGENT_WEBHOOK_SECRET
# Paste the generated secret
```

## Repository Settings

### Branch Protection (Recommended for L3)

For L3 tasks (sensitive changes), configure branch protection:

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main` (or your default branch)
3. Enable:
   - Require a pull request before merging
   - Require approvals: 1 (or more)
   - Require review from Code Owners (optional)
   - Require status checks to pass: `agent/ci`

### CODEOWNERS (Optional for L3)

Create `.github/CODEOWNERS` to require specific reviewers:

```
# Sensitive paths require review from specific team
/.github/workflows/ @org/security-team
/.github/actions/ @org/security-team
/package.json @org/platform-team
```

## Verification Checklist

Run this checklist before using the agent:

- [ ] GitHub Copilot is enabled for the repository
- [ ] `AGENT_GH_TOKEN` secret is configured with correct permissions
- [ ] Auto-merge is enabled (or accept L1→L2 downgrade)
- [ ] Actions have write permissions for issues/PRs/contents
- [ ] Labels are bootstrapped (`gh workflow run agent-bootstrap.yml`)
- [ ] Test issue template is available
- [ ] (Optional) Webhook secrets configured
- [ ] (Optional) Branch protection configured for L3

## Troubleshooting

### Copilot Assignment Fails (422 Error)

**Symptoms**: Issue assignment to Copilot returns 422 Unprocessable Entity

**Possible causes**:
1. Copilot not enabled for this repository
2. Copilot license doesn't cover private repositories
3. Organization policy blocks Copilot
4. Token doesn't have required permissions

**Solution**:
- Check organization Copilot settings
- Verify repository has Copilot access
- Ensure PAT has all required permissions

### Workflow Doesn't Trigger

**Symptoms**: Creating an issue doesn't trigger agent-intake workflow

**Possible causes**:
1. Issue doesn't contain `<!-- agent-request -->` marker
2. Author is not a collaborator (OWNER/MEMBER/COLLABORATOR)
3. Workflow file has syntax errors
4. Actions are disabled for the repository

**Solution**:
- Use the "Agent Request" issue template
- Verify author has collaborator access
- Check workflow syntax with `gh workflow view`
- Enable Actions in repository settings

### Auto-Merge Doesn't Work

**Symptoms**: L1 PRs don't auto-merge even when CI passes

**Possible causes**:
1. Auto-merge not enabled in repository settings
2. Branch protection requires reviews
3. Required checks not configured
4. Bot doesn't have permission to merge

**Solution**:
- Enable auto-merge in Settings → General
- Adjust branch protection rules
- Add `agent/ci` as required check
- System will auto-downgrade L1 to L2 if auto-merge fails

### CI Doesn't Run

**Symptoms**: `agent/ci` check never appears on PRs

**Possible causes**:
1. `workflow_dispatch` trigger failed
2. Actions permissions insufficient
3. Workflow file has errors
4. PR is from a fork (not supported in MVP)

**Solution**:
- Check Actions tab for failed workflow runs
- Verify Actions have write permissions
- Ensure PR is from same repository (not fork)
- Check `agent-pr-router` workflow logs

## Security Considerations

### Token Security

- **Never commit** `AGENT_GH_TOKEN` to the repository
- Use fine-grained PAT (not classic PAT)
- Set shortest acceptable expiration
- Rotate token regularly
- Audit token usage in Settings → Developer settings

### Sensitive Path Protection

The system automatically blocks auto-merge for:
- `.github/workflows/**`
- `.github/actions/**`
- `**/*.yml`, `**/*.yaml`
- `package.json`, lock files
- Dockerfile, docker-compose
- `.env*`, `**/*secret*`, `**/*credential*`, `**/*token*`

These always require L3 (manual review).

### Actor Gating

Only these users can trigger the agent:
- Repository owners (OWNER)
- Organization members (MEMBER)
- Repository collaborators (COLLABORATOR)

External contributors cannot trigger the agent.

## Next Steps

After completing this checklist:

1. Run label bootstrap: `gh workflow run agent-bootstrap.yml`
2. Create a test issue using the "Agent Request" template
3. Verify Spec PR is created by Copilot
4. Review and merge Spec PR
5. Verify Plan PR is created
6. Review and merge Plan PR
7. Verify task issues are created
8. Monitor task execution

## Support

For issues or questions:
- Check workflow logs in Actions tab
- Review `.sisyphus/notepads/github-autonomous-agent/` for implementation notes
- Check `auto-agent/docs/CONFIG.md` for configuration details
