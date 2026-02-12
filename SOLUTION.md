# Fix Summary: Version Mismatch Issue

## Problem Statement

The issue title was "修复问题" (Fix Problem), requesting to investigate why "version would auto-increment" and fix the failing workflows.

## Root Cause Analysis

### What Actually Happened

The issue was **NOT** about version auto-incrementing. The real problem:

1. **Initial State**: The codebase had `STATE_VERSION = 18` in `.github/scripts/lib/state-manager.js`

2. **Epic #59 Initialized**: When Epic issue #59 was created, it generated a state comment with `"version": 18`

3. **Manual Code Update**: Someone manually changed `STATE_VERSION` from 18 to 19 in commit `2371b0f` on 2026-02-12

4. **Incompatibility**: Now when workflows try to read Epic #59's state (version 18), they fail because the code expects version 19

5. **Strict Validation**: The `assertStateVersion` function strictly rejects mismatched versions with error:
   ```
   Unsupported state version: 18. Expected 19.
   This release does not support old state formats. Please start a new Epic issue.
   ```

### Why This Happened

- **Version was manually changed** in the code, not auto-incremented
- **No migration mechanism** existed to handle version upgrades
- **Existing Epic issues became incompatible** immediately after the version bump

## Solution Implemented

### Automatic State Migration

Added automatic migration logic in `assertStateVersion` function that:

1. Detects when state version is 18 and code expects 19
2. Automatically upgrades the state to version 19
3. Logs a warning for tracking
4. Returns the upgraded state

**Code Changes** (`.github/scripts/lib/state-manager.js`):

```javascript
function assertStateVersion(state) {
  if (!state) {
    return null;
  }

  // Automatic migration from version 18 to 19
  // Version 19 has no schema changes from 18, just a version bump
  if (state.version === 18 && STATE_VERSION === 19) {
    core.warning(`Migrating state from version ${state.version} to ${STATE_VERSION}`);
    state.version = STATE_VERSION;
    return state;
  }

  if (state.version !== STATE_VERSION) {
    throw new Error(
      `Unsupported state version: ${state.version}. Expected ${STATE_VERSION}. ` +
      'This release does not support old state formats. Please start a new Epic issue.'
    );
  }

  return state;
}
```

### Additional Deliverables

1. **Migration Script** (`.github/scripts/migrate-state-version.js`): 
   - Manual migration tool if needed
   - Can batch update multiple Epic issues

2. **Documentation** (`docs/version-mismatch-fix.md`):
   - Detailed root cause analysis in Chinese
   - Solution explanation
   - Prevention strategies

3. **Testing**:
   - Verified migration from version 18 → 19 works
   - Verified version 19 states pass through unchanged
   - Verified older versions (17) are correctly rejected

## Benefits

✅ **Backward Compatible**: Existing Epic issues with version 18 automatically work

✅ **No Manual Intervention**: Workflows will automatically handle the migration

✅ **Transparent**: Migration is logged for tracking

✅ **Future-Proof**: Pattern can be extended for future version migrations

## Files Changed

1. `.github/scripts/lib/state-manager.js` - Added auto-migration logic
2. `.github/scripts/migrate-state-version.js` - Manual migration script (backup)
3. `docs/version-mismatch-fix.md` - Chinese documentation
4. `SOLUTION.md` - This summary document

## Testing Results

All tests passed:
- ✅ Version 18 state migrates to version 19
- ✅ Version 19 state unchanged
- ✅ Invalid versions correctly rejected

## Explanation of "Auto-increment" Misunderstanding

The version does **NOT** auto-increment. What happened:
- Someone manually changed `STATE_VERSION = 18` to `STATE_VERSION = 19` in the code
- This made all existing Epic issues (with version 18) incompatible
- The fix adds automatic migration to handle this scenario

## Conclusion

The issue is now resolved. Epic #59 and any other Epic issues with version 18 will automatically migrate to version 19 when their state is read, eliminating the workflow failures.
