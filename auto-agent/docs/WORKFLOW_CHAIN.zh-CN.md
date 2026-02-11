# Agent 当前链路总览（单链路）

本文档描述 `cli/src/templates` 的当前实现链路（无兼容分支）：

- 唯一入口：`agent-request`
- 唯一阶段链：`spec -> plan -> execution`
- 路由主标识：`Agent-Schema-Version` + `Agent-PR-Type`

## 1. 目标

- 从需求 Issue 自动推进到规格、计划与任务执行。
- 通过 PR 路由、CI、合并策略和命令控制形成闭环。
- 使用 Epic Issue 状态评论（state JSON）追踪全流程。

## 2. 入口工作流

| Workflow | 触发 | 作用 | 关键脚本 |
|---|---|---|---|
| `agent-intake.yml` | `issues.opened` | 初始化 state，创建 `spec` phase issue | `initialize-state.js`, `add-labels.js`, `create-phase-issue.js` |
| `agent-pr-router.yml` | `pull_request.opened/synchronize/closed` | 识别并路由 `spec`/`plan`/`task` PR | `identify-pr-type.js`, `handle-spec-merge.js`, `handle-plan-merge.js`, `trigger-ci.js` |
| `agent-task-creator.yml` | `workflow_dispatch` | 根据 plan 生成 task issues，并触发首轮派发 | `create-tasks.js` |
| `agent-task-dispatcher.yml` | `workflow_dispatch` | 选择下一个可执行任务并分配给 Copilot | `dispatch-task.js` |
| `agent-commands.yml` | `issue_comment.created` | 处理 `/pause` `/resume` `/retry` 等命令 | `parse-command.js`, `handle-commands.js`, `handle-pause-resume.js` |
| `agent-ci.yml` | `workflow_dispatch` | 执行 CI 并回写 check run | `validate-pr.js`, `create-check-run.js`, `update-check-run.js` |
| `agent-merge-policy.yml` | `workflow_dispatch` | 计算 L1/L2/L3 并执行相应策略 | `evaluate-merge-policy.js`, `auto-merge-l1.js` |
| `agent-reconcile.yml` | `schedule/workflow_dispatch` | 状态对账与补偿触发 | `reconcile-state.js` |
| `handle-pr-closed-unmerged.yml` | `pull_request.closed` 且未合并 | phase PR 关闭补偿提示 | 内嵌 `github-script` |
| `handle-phase-issue-closed.yml` | `issues.closed` 且 body 含 phase marker | phase issue 手工关闭补偿提示 | 内嵌 `github-script` |
| `agent-bootstrap.yml` | `workflow_dispatch` | labels 初始化/修复 | `bootstrap-labels.js` |

## 3. 主流程

### 3.1 Intake -> Spec

1. 用户通过 `issue-templates/agent-request.yml` 提交需求。
2. `agent-intake.yml` 检测 `<!-- agent-request -->`。
3. `initialize-state.js` 写入初始状态评论。
4. `create-phase-issue.js` 创建 `spec` 阶段 issue，并给 Copilot 下发提示词。

对应文件：

- `cli/src/templates/workflows/agent-intake.yml`
- `cli/src/templates/issue-templates/agent-request.yml`
- `cli/src/templates/scripts/initialize-state.js`
- `cli/src/templates/scripts/create-phase-issue.js`
- `cli/src/templates/scripts/prompts/phase/spec.md`

### 3.2 Spec 合并 -> Plan

1. `agent-pr-router.yml` 调用 `identify-pr-type.js` 识别 `spec` PR。
2. spec PR merged 后触发 `handle-spec-merge.js`。
3. `handle-spec-merge.js` 更新 phase 状态并创建 `plan` phase issue。

对应文件：

- `cli/src/templates/workflows/agent-pr-router.yml`
- `cli/src/templates/scripts/identify-pr-type.js`
- `cli/src/templates/scripts/handle-spec-merge.js`
- `cli/src/templates/scripts/prompts/phase/plan.md`

### 3.3 Plan 合并 -> 任务创建与首轮派发

1. plan PR merged 后触发 `handle-plan-merge.js`。
2. `handle-plan-merge.js` dispatch `agent-task-creator.yml`。
3. `create-tasks.js` 从 `plans/issue-<id>.yaml` 生成 task issues。
4. `agent-task-creator.yml` 随后 dispatch `agent-task-dispatcher.yml`。
5. `dispatch-task.js` 选择可执行任务并分配给 Copilot。

对应文件：

- `cli/src/templates/scripts/handle-plan-merge.js`
- `cli/src/templates/workflows/agent-task-creator.yml`
- `cli/src/templates/scripts/create-tasks.js`
- `cli/src/templates/workflows/agent-task-dispatcher.yml`
- `cli/src/templates/scripts/dispatch-task.js`
- `cli/src/templates/scripts/prompts/dispatch/task.md`

### 3.4 Task PR -> CI 与合并策略

1. `agent-pr-router.yml` 对 task PR 的 `opened/synchronize` 调用 `trigger-ci.js`。
2. `trigger-ci.js` dispatch:
   - `agent-ci.yml`
   - `agent-merge-policy.yml`（携带 parent/task metadata）
3. CI 与 merge policy 回写结果并决定后续动作。

对应文件：

- `cli/src/templates/scripts/trigger-ci.js`
- `cli/src/templates/workflows/agent-ci.yml`
- `cli/src/templates/workflows/agent-merge-policy.yml`

## 4. 标识契约（唯一）

使用 v2 marker（写在 marker block 内）：

- `Agent-Schema-Version: 2`
- `Agent-Parent-Issue: <number>`
- `Agent-PR-Type: spec|plan|task`（PR）
- `Agent-Issue-Type: phase|task`（Issue）
- `Agent-Phase-Name: spec|plan|execution`（phase 实体）
- `Agent-Task-Key: task-<slug>`（task 实体）

消费位置：

- `cli/src/templates/scripts/lib/marker-parser.js` (`parseAgentMetadata`)
- `cli/src/templates/scripts/identify-pr-type.js`
- `cli/src/templates/workflows/handle-pr-closed-unmerged.yml`

## 5. Prompt 体系

| 目录 | 用途 | 调用方 |
|---|---|---|
| `prompts/phase/spec.md` | 规格阶段指令 | `create-phase-issue.js` |
| `prompts/phase/plan.md` | 计划阶段指令 | `create-phase-issue.js` |
| `prompts/phase/execution.md` | 执行阶段说明 | `create-phase-issue.js` |
| `prompts/dispatch/task.md` | 任务派发指令 | `dispatch-task.js` |

## 6. 命令与恢复

- 命令入口：`agent-commands.yml`
- 支持命令：`/approve-task`, `/pause`, `/resume`, `/retry`, `/skip-phase`, `/cancel-phase`, `/reopen`, `/abort`
- 补偿入口：
  - `handle-pr-closed-unmerged.yml`
  - `handle-phase-issue-closed.yml`
  - `agent-reconcile.yml`

## 7. 关键文件索引

### Workflows

- `cli/src/templates/workflows/agent-intake.yml`
- `cli/src/templates/workflows/agent-pr-router.yml`
- `cli/src/templates/workflows/agent-task-creator.yml`
- `cli/src/templates/workflows/agent-task-dispatcher.yml`
- `cli/src/templates/workflows/agent-ci.yml`
- `cli/src/templates/workflows/agent-merge-policy.yml`
- `cli/src/templates/workflows/agent-commands.yml`
- `cli/src/templates/workflows/agent-reconcile.yml`
- `cli/src/templates/workflows/handle-pr-closed-unmerged.yml`
- `cli/src/templates/workflows/handle-phase-issue-closed.yml`
- `cli/src/templates/workflows/agent-bootstrap.yml`

### Scripts

- `cli/src/templates/scripts/create-phase-issue.js`
- `cli/src/templates/scripts/identify-pr-type.js`
- `cli/src/templates/scripts/handle-spec-merge.js`
- `cli/src/templates/scripts/handle-plan-merge.js`
- `cli/src/templates/scripts/create-tasks.js`
- `cli/src/templates/scripts/dispatch-task.js`
- `cli/src/templates/scripts/trigger-ci.js`
- `cli/src/templates/scripts/initialize-state.js`
- `cli/src/templates/scripts/lib/phase-manager.js`
- `cli/src/templates/scripts/lib/state-manager.js`
- `cli/src/templates/scripts/lib/retry-handler.js`

### Prompts

- `cli/src/templates/scripts/prompts/phase/spec.md`
- `cli/src/templates/scripts/prompts/phase/plan.md`
- `cli/src/templates/scripts/prompts/phase/execution.md`
- `cli/src/templates/scripts/prompts/dispatch/task.md`
