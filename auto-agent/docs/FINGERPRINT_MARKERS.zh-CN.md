# 指纹标记说明（Fingerprint Markers）

本文档说明当前系统使用的指纹标记。标记用于工作流识别与状态管理，**请勿手动修改或删除**。

## 1. Issue 模板标记

### `<!-- agent-request -->`

- 位置：`issue-templates/agent-request.yml`
- 用途：标识标准需求入口 issue
- 检测方：`workflows/agent-intake.yml`
- 作用：触发主链路 `spec -> plan -> task`

示例：

```yaml
- type: textarea
  id: fingerprint
  attributes:
    value: "<!-- agent-request -->"
```

## 2. 状态标记

### `<!-- agent-state:json -->`

- 位置：
  - `config/config.yml` (`state.marker`)
  - `scripts/initialize-state.js`
  - `scripts/lib/state-manager.js`
- 用途：在 Epic Issue 评论中持久化状态 JSON

示例结构：

````markdown
<!-- agent-state:json -->
```json
{
  "state_id": "agent-state:owner/repo:123",
  "version": 17,
  "parent_issue": 123,
  "current_phase": "spec",
  "phases": {
    "spec": { "status": "pending" },
    "plan": { "status": "pending" },
    "execution": { "status": "pending" }
  }
}
```
````

## 3. 任务标记

### `<!-- agent-task -->`

- 位置：`scripts/create-tasks.js`
- 用途：标识 Agent 生成的 task issue
- 作用：用于后续任务派发与状态跟踪

## 4. PR/Issue 元数据标记

以下标记用于路由与关联（写在 PR/Issue body）：

- `Agent-Parent-Issue: <number>`
- `Agent-Task-Id: <id>`

说明：

- phase PR 使用 `spec` / `plan`
- task PR 使用 `task-<n>`（支持连字符）

消费方：

- `scripts/lib/utils.js` (`parseMarkers`)
- `scripts/identify-pr-type.js`
- `workflows/handle-pr-closed-unmerged.yml`

## 5. 一致性检查建议

建议在改动后执行：

```bash
grep -R "agent-request\|agent-state:json\|agent-task\|Agent-Parent-Issue\|Agent-Task-Id" cli/src/templates
```

并确保：

- `agent-intake.yml` 只检测 `<!-- agent-request -->`
- 路由只依赖 `Agent-Task-Id`
- 不再出现已废弃的历史标记
