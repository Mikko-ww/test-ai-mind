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

### ✅ 已实现的解决方案 (Implemented Solution)

**自动版本迁移 (Automatic Version Migration)**

我们在 `assertStateVersion` 函数中添加了自动迁移逻辑，使得系统能够自动处理从 version 18 到 version 19 的升级。

**实现位置**: `.github/scripts/lib/state-manager.js:83-90`

```javascript
// Automatic migration from version 18 to 19
// Version 19 has no schema changes from 18, just a version bump
if (state.version === 18 && STATE_VERSION === 19) {
  core.warning(`Migrating state from version ${state.version} to ${STATE_VERSION}`);
  state.version = STATE_VERSION;
  return state;
}
```

**工作原理**:
1. 当系统读取 Epic #59 的状态时（version 18）
2. `assertStateVersion` 检测到版本不匹配
3. 自动将状态升级到 version 19
4. 记录警告信息，便于追踪
5. 返回升级后的状态
6. 下次保存时，会使用 version 19

**优点**:
- ✅ 无需手动操作
- ✅ 向后兼容
- ✅ 自动修复所有 version 18 的状态
- ✅ 有日志记录，便于追踪

### 备选方案 (Alternative Solutions)

#### 方案 1: 手动更新状态评论 (Manual Update)

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

**说明**: 由于已实现自动迁移，通常不需要手动操作。

#### 方案 2: 回退代码版本 (Revert Code Version)

将 `STATE_VERSION` 从 19 改回 18，但这会影响所有新创建的 Epic issues。

**不推荐**: 这会导致新的 Epic issues 使用旧版本。

#### 方案 3: 使用迁移脚本 (Use Migration Script)

如果需要立即更新所有状态评论（而不是等待自动迁移），可以使用迁移脚本:

```bash
cd .github/scripts
GITHUB_TOKEN=<your-token> \
GITHUB_REPOSITORY=Mikko-ww/test-ai-mind \
ISSUE_NUMBER=59 \
node migrate-state-version.js
```

**说明**: 自动迁移会在状态被读取时处理，通常不需要手动运行脚本。

## 测试验证 (Testing)

已通过以下测试验证修复:

1. ✅ Version 18 状态自动迁移到 version 19
2. ✅ Version 19 状态保持不变
3. ✅ 其他版本（如 17）正确拒绝

## 预防措施 (Prevention)

1. **版本升级政策**: 制定明确的 STATE_VERSION 升级策略
   - 记录每次版本升级的原因
   - 升级前评估影响范围
   - **✅ 已实现**: 自动迁移机制，支持向后兼容
   
2. **迁移机制**: 实现自动版本迁移
   - **✅ 已实现**: 支持从 version 18 到 19 的自动迁移
   - 未来版本升级时，添加相应的迁移逻辑
   
3. **通知机制**: 版本升级时的处理策略
   - **✅ 已实现**: 迁移时记录警告信息
   - 系统会在日志中显示迁移信息

## 总结 (Summary)

- ❌ **错误理解**: Version 不会自动递增
- ✅ **真实原因**: 代码被手动修改，从 version 18 升级到 19
- ✅ **已修复**: 实现了自动版本迁移，无需手动操作
- ✅ **长期方案**: 已实现版本迁移机制，支持向后兼容
- ✅ **测试验证**: 所有测试通过，确认修复有效

## 文件变更 (Files Changed)

1. `.github/scripts/lib/state-manager.js`: 添加自动迁移逻辑
2. `.github/scripts/migrate-state-version.js`: 迁移脚本（备用）
3. `docs/version-mismatch-fix.md`: 问题分析和解决方案文档
