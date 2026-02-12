# Version Mismatch Issue - Root Cause Analysis and Fix

## 问题根本原因 (Root Cause)

### 发生了什么 (What Happened)

1. **初始状态**: 代码中 `STATE_VERSION` 设置为 18
   - 位置: `.github/scripts/lib/state-manager.js:6`
   
2. **Epic #59 初始化**: 当 Epic #59 被初始化时，系统创建了一个包含 version 18 的状态评论
   - 第一条状态评论包含: `"version": 18`
   
3. **代码升级**: 有人将代码中的 `STATE_VERSION` 从 18 升级到 19
   - 提交: 2371b0f775206a32c3c6c8f83985094339e83ad2
   - 日期: 2026-02-12T17:39:21Z
   
4. **导致失败**: 现在当工作流尝试读取 Epic #59 的状态时，会失败
   - 原因: Epic #59 状态评论包含 version 18
   - 但代码期望 version 19
   - `assertStateVersion` 函数会抛出错误

### 为什么 Version 会"自增" (Why Version "Auto-increments")

**重要**: Version 并不会自动递增！这是一个误解。

真相是:
- **手动更改**: 有人手动修改了代码，将 `STATE_VERSION` 从 18 改为 19
- **不兼容**: 这个更改使得所有现有的 Epic issues（使用 version 18）变得不兼容
- **设计限制**: 系统设计为严格验证版本，拒绝旧版本的状态

### 错误信息

```
Unsupported state version: 18. Expected 19.
This release does not support old state formats. Please start a new Epic issue.
```

这个错误出现在 `.github/scripts/lib/state-manager.js:84-87`

## 解决方案 (Solution)

### 方案 1: 更新现有状态评论 (Update Existing State Comment) ⭐ 推荐

为 Epic #59 发布一个新的状态评论，将 version 从 18 更新到 19。

**步骤**:

1. 手动运行迁移脚本:
   ```bash
   cd .github/scripts
   GITHUB_TOKEN=<your-token> \
   GITHUB_REPOSITORY=Mikko-ww/test-ai-mind \
   ISSUE_NUMBER=59 \
   node migrate-state-version.js
   ```

2. 或者手动在 Epic #59 添加新评论:
   ```markdown
   <!-- agent-state:json -->
   ```json
   {
     "state_id": "agent-state:Mikko-ww/test-ai-mind:59",
     "version": 19,
     "parent_issue": 59,
     "current_phase": "spec",
     "phases": {
       "spec": {
         "status": "done",
         "issue_number": null,
         "pr_number": null,
         "retry_count": 0,
         "started_at": null,
         "completed_at": "2026-02-12T17:33:36.683Z"
       },
       "plan": {
         "status": "pending",
         "issue_number": null,
         "pr_number": null,
         "retry_count": 0,
         "started_at": null,
         "completed_at": null
       },
       "execution": {
         "status": "pending",
         "issue_number": null,
         "pr_number": null,
         "retry_count": 0,
         "started_at": null,
         "completed_at": null
       }
     },
     "plan_path": null,
     "cursor_task_id": null,
     "tasks": {},
     "paused": false,
     "created_at": "2026-02-12T16:57:11.247Z",
     "updated_at": "2026-02-12T17:33:36.683Z"
   }
   ```
   ```
   Agent State Updated (version 19)
   Current Phase: `spec`
   _This comment tracks execution state. Do not edit manually._
   ```

### 方案 2: 回退代码版本 (Revert Code Version)

将 `STATE_VERSION` 从 19 改回 18，但这会影响所有新创建的 Epic issues。

**不推荐**: 这会导致新的 Epic issues 使用旧版本。

### 方案 3: 实现版本迁移机制 (Implement Version Migration)

未来改进: 在 `assertStateVersion` 函数中添加版本迁移逻辑。

```javascript
function assertStateVersion(state) {
  if (!state) {
    return null;
  }

  // Support migration from version 18 to 19
  if (state.version === 18 && STATE_VERSION === 19) {
    core.warning('Migrating state from version 18 to 19');
    state.version = 19;
    return state;
  }

  if (state.version !== STATE_VERSION) {
    throw new Error(
      `Unsupported state version: ${state.version}. Expected ${STATE_VERSION}.`
    );
  }

  return state;
}
```

## 预防措施 (Prevention)

1. **版本升级政策**: 制定明确的 STATE_VERSION 升级策略
   - 记录每次版本升级的原因
   - 升级前评估影响范围
   
2. **迁移机制**: 实现自动版本迁移
   - 支持向后兼容
   - 自动升级旧状态
   
3. **通知机制**: 版本升级时通知所有活跃的 Epic issues
   - 自动运行迁移
   - 或提示用户手动迁移

## 总结 (Summary)

- ❌ **错误理解**: Version 不会自动递增
- ✅ **真实原因**: 代码被手动修改，从 version 18 升级到 19
- ✅ **修复方法**: 为 Epic #59 更新状态评论，使用 version 19
- ✅ **长期方案**: 实现版本迁移机制，支持向后兼容
