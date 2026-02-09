# Migration Guide: Phase Issue Architecture

This guide helps you migrate from the old single-Issue workflow to the new Phase Issue architecture.

## What Changed?

### Old Architecture (Before)
- Single Issue for entire workflow
- Issue reopened after each phase
- All phases tracked on one Issue

### New Architecture (After)
- Epic Issue as parent container
- Separate Issue for each phase (Requirement/Spec/Plan)
- Phase Issues are closed (not reopened) when complete
- Better progress tracking and Copilot compatibility

## Breaking Changes

### 1. Issue Structure
- **Before**: One Issue (#100) handles all phases
- **After**: Epic Issue (#100) creates Phase Issues (#101, #102, #103)

### 2. State Management
- **Before**: State version 15 or lower
- **After**: State version 16 with `phases` object

### 3. Commands
- **New**: `/retry`, `/skip-phase`, `/cancel-phase`, `/reopen`
- **Changed**: `/resume` now works with phase retry logic

## Migration Steps

### Step 1: Update CLI Tool

```bash
# Update to latest version
npm install -g flowmind-cli@latest

# Or use npx
npx flowmind-cli@latest update
```

### Step 2: Update Repository Files

```bash
cd /path/to/your/repo

# Update all agent files
flowmind update

# Validate the update
flowmind validate
```

### Step 3: Complete In-Progress Work

**Option A: Finish Current Work**
- Complete any in-progress Epic Issues using the old workflow
- Wait for all PRs to merge and tasks to complete

**Option B: Cancel and Restart**
- Use `/abort` command on in-progress Epic Issues
- Recreate them after migration

### Step 4: Verify Migration

```bash
# Check workflows are updated
ls -la .github/workflows/agent-*.yml

# Check scripts are updated
ls -la .github/scripts/*.js

# Verify configuration
cat .github/agent/config.yml | grep -A 5 "phases:"
```

### Step 5: Test New Workflow

1. Create a test Epic Issue
2. Verify Requirement Issue is auto-created
3. Test new commands (`/retry`, `/skip-phase`)
4. Confirm Phase Issues are created sequentially

## Configuration Updates

### N Configuration Sections

Add these to `.github/agent/config.yml`:

```yaml
flowmind:
  base_dir: ".flowmind"

retry:
  max_attempts: 3
  create_new_issue: true

phases:
  requirement:
    output_file: "requirement.md"
    timeout_minutes: 20
  spec:
    output_file: "spec.md"
    timeout_minutes: 20
  plan:
    output_files:
      - "plan.yaml"
      - "plan.md"
    timeout_minutes: 20
```

### Updated Paths

```yaml
paths:
  requirement_dir: "docs/requirements"  # NEW
  spec_dir: "docs/specs"
  plan_yaml_r: "plans"
  plan_md_dir: "plans"
```

## Troubleshooting

### Issue: Old Epic Issues Not Working

**Solution**: Complete or abort old Epic Issues before migration. The new architecture is not backward compatible with in-progress work.

### Issue: Phase Issue Not Created

**Solution**: 
1. Check state version: Should be 16
2. Verify `create-phase-issue.js` exists
3. Check workflow logs for errors

### Issue: Commands Not Working

**Solution**:
1. Ensure `handle-commands.js` is updated
2. Verify `agent-commands.yml` includes new commands
3. Check command is issued on Epic Issue (or will be forwarded)

### Issue: State Corruption

**Solution**:
1. Check state comment format in Epic Issue
2. Use `/abort` and recreate Epic Issue
3. Contact support if issue persists

## Rollback Procedure

If you need to rollback:

```bash
# Restore from backup (created during update)
cd .github
cp -r .agent-backup/TIMESTAMP/* ./

# Or reinstall old version
npm install -g flowmind-cli@<old-version>
flowmind update --force
```

## New Features

### Phase-Specific Commands

- `/retry` - Retry failed phase (max 3 attempts)
- `/skip-phase` - Skip current phase
- `/cancel-phase` - Cancel current phase
- `/reopen` - Reopen closed Phase Issue

### Better Progress Tracking

- Epic Issue shows all Phase Issues
- Each phase has its own Issue number
- Clear visual hierarchy

### Improved Error Recovery

- Automatic retry with new Issues
- Phase-level cancellation
- Better concurrency handling

## FAQ

**Q: Can I migrate in-progress Epic Issues?**
A: No, complete or abort them first.

**Q: Will old Epic Issues still work?**
A: No, the new architecture requires state version 16.

**Q: Do I need to update my Issue templates?**
A: No, Epic Issue templates remain the same.

**Q: What happens to existing Task Issues?**
A: Task execution logic is unchanged, only phase management changed.

**Q: Can I customize phase names?**
A: No, phase names (requirement/spec/plan) are fixed.

## Support

- **Documentation**: See [AGENT-README.md](AGENT-README.md)
- **Configuration**: See [CONFIG.md](CONFIG.md)
- **Issues**: https://github.com/Mikko-ww/flowmind-cli/issues

---

**Migration completed?** Create a test Epic Issue to verify everything works!
