# Auto Agent 使用说明

本仓库使用自动化 GitHub 工作流，将需求 Issue 逐步推进到实现 PR。

## 核心链路

当前系统仅保留单一主链路：

`agent-request -> spec -> plan -> task execution`

### 含义

- intake 固定从 `spec` 开始。
- 阶段顺序固定为 `spec -> plan -> execution`。
- 任务 issue 创建后会自动触发任务派发。
- 已移除 requirement/assign/status 历史链路。

## 标识契约

PR/Issue body 统一使用：

- `Agent-Parent-Issue: <number>`
- `Agent-Task-Id: <id>`

`Agent-Phase` 已废弃，不再参与路由。

## 主要工作流

- `agent-intake.yml`：处理 `agent-request` 并创建 `spec` 阶段 issue
- `agent-pr-router.yml`：路由 `spec` / `plan` / `task` PR 事件
- `agent-task-creator.yml`：根据 plan 创建任务 issue
- `agent-task-dispatcher.yml`：分配下一个可执行任务
- `agent-ci.yml`：运行检查并回写 check-run
- `agent-merge-policy.yml`：判定 L1/L2/L3 风险等级
- `agent-commands.yml`：处理聊天命令
- `agent-reconcile.yml`：定时状态对账（full 预设）

## 典型使用流程

1. 使用 `Agent Request` 模板提交需求 Issue。
2. 等待并审查 `spec` PR，确认后合并。
3. 等待并审查 `plan` PR，确认后合并。
4. 系统自动创建任务 issue，并开始派发任务给 Copilot。
5. 按风险等级规则审查并合并任务 PR。

## 风险等级

- `L1`：CI 通过后自动合并
- `L2`：CI 通过后需评论 `/approve-task`
- `L3`：必须人工审查

## ChatOps 命令

- `/approve-task`：批准并合并 L2 任务 PR
- `/pause`：暂停任务派发
- `/resume`：恢复任务派发
- `/retry`：重试当前阶段
- `/skip-phase`：跳过当前阶段
- `/cancel-phase`：取消当前阶段
- `/reopen`：重新打开已关闭的阶段 issue
- `/abort`：终止整条流水线

## 必需标签

setup 会创建 21 个标签，核心包括：

- 生命周期：`agent:requested`, `agent:spec-in-progress`, `agent:plan-in-progress`, `agent:executing`, `agent:done`, `agent:blocked`, `agent:paused`
- 任务：`agent:task`, `agent:pending`, `agent:in-progress`, `agent:in-review`, `agent:cancelled`
- 风险等级：`agent:l1`, `agent:l2`, `agent:l3`
- PR 类型：`agent:spec-pr`, `agent:plan-pr`, `agent:task-pr`
- 特殊：`agent:probe`

## 常见问题排查

### 没有创建 spec 阶段 issue

- 检查 `agent-intake.yml` 日志
- 确认 issue body 含 `<!-- agent-request -->`

### spec 合并后没有创建 plan

- 检查 `agent-pr-router.yml` 日志
- 确认 PR body 包含 `Agent-Task-Id: spec`

### 任务没有开始派发

- 检查 `agent-task-creator.yml` 与 `agent-task-dispatcher.yml` 日志
- 确认存在 `plans/issue-<id>.yaml`

### task PR 没有触发 CI

- 检查 `agent-pr-router.yml` 的 dispatch 记录
- 检查 `agent-ci.yml` 运行日志

## 安全建议

- 仅允许可信协作者触发链路
- 最小化并定期轮换 `AGENT_GH_TOKEN`
- L3 变更必须人工审查
- 不要手动编辑状态评论（`<!-- agent-state:json -->`）

## 相关文档

- `auto-agent/docs/CONFIG.md`
- `auto-agent/docs/MIGRATION.md`
- `auto-agent/docs/WORKFLOW_CHAIN.zh-CN.md`
