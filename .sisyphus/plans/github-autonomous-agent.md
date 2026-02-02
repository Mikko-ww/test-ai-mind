# GitHub 自动智能体（Issue → Spec → Plan → Copilot → 串行 PR 交付）

## TL;DR

> **目标**：在 GitHub 远端实现一个“自治交付流水线”：协作者提交需求 Issue 后，系统用 Copilot coding agent 生成中文需求文档 PR（Spec）→ 你审批合并 → 生成可执行任务清单（YAML 源 + 中文阅读版 MD）PR（Plan）→ 你审批合并 → 系统按顺序为每个任务创建子 Issue 并逐个指派给 Copilot → 每个任务产出 PR，按任务等级 L1/L2/L3 自动/半自动合并 → 全部完成后更新总状态并通过 GitHub + webhook 通知。
>
> **交付物**：
> - GitHub Actions 工作流：控制面（编排/状态机/派发）+ 数据面（CI 验证）
> - 可配置的 `.github/agent/config.yml`（非敏感）+ Secrets（webhook/token 等敏感）
> - 中文 Spec 模板 + Plan（`plan.yaml` + `PLAN.md`）模板
> - 标签体系、ChatOps 指令体系、Runbook（失败恢复）
>
> **预估工作量**：Large
> **并行执行**：YES（2-3 波，先搭框架再补齐安全与恢复）
> **关键路径**：前置检查 → Spec PR 闭环 → Plan PR 闭环 → Task 派发闭环 → L1/L2/L3 合并策略 → 失败恢复/对账

---

## Context

### 原始需求（概述）
- 需求从 GitHub 获取（Issue 方式优先）。
- 生成需求文档（中文），提交 PR，人工审批后继续。
- 生成“可执行任务清单文件”（YAML 源 + 中文阅读版 MD），提交 PR，人工审批后继续。
- 之后按任务顺序指派给 GitHub Copilot；每个任务完成后更新状态、提 PR、审批合并，然后继续下一任务。
- 全部完成后更新总状态并通知。

### 已确认决策
- **托管模型**：GitHub-native（GitHub Actions-first），MVP 不引入外部常驻服务/队列/DB。
- **输入权限**：仅仓库协作者/团队（OWNER/COLLABORATOR/MEMBER）。
- **审批闸门**：Spec 与 Plan 都用 PR Review（审计最清晰）。
- **任务等级**：3 级。
  - **L1**：allowlist（低风险路径/类型）+ CI 全绿 ⇒ 自动合并。
  - **L2**：CI 全绿 + PR 评论精确命令 `/approve-task` ⇒ 合并。
  - **L3**：必须走 PR Review（建议叠加 CODEOWNERS + 更高 approval 数）。
- **文档语言**：中文。
- **通知**：可配置；MVP 支持 GitHub 评论/状态 + webhook；保留扩展点。
- **派发粒度**：每个任务一个子 Issue；严格串行（MVP 不做并行）。
- **生成器**：Spec/Plan 由 GitHub Copilot coding agent 产出（通过 Issue assignment API）。
- **CI 目标**：为 `copilot/**` PR 设计可自动执行的验证，不依赖人工点 “Approve and run workflows”。

### 关键参考资料（外部）
- Copilot coding agent：通过 API 把 issue 分配给 `copilot-swe-agent[bot]` 来启动任务
  - https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/assign-copilot-to-an-issue
  - https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-a-pr
  - https://github.blog/changelog/2025-12-03-assign-issues-to-copilot-using-the-api/
  - Doc 源文件（稳定引用，避免站点重定向导致“看起来是别的页面”）：
    - https://github.com/github/docs/blob/799e3d2013dbed1419196a91adb2ec015ac0499d/content/copilot/how-tos/use-copilot-agents/coding-agent/create-a-pr.md
- OpenHands resolver（已归档，仅作为思路参考；不要依赖其 repo 稳定性）
  - 归档仓库：https://github.com/All-Hands-AI/openhands-resolver
  - 更稳定的工作流参考（OpenHands 主仓库）：https://github.com/OpenHands/OpenHands/blob/main/.github/workflows/openhands-resolver.yml
- Aider issue→PR workflows（可借鉴的 GitHub Actions plumbing）
  - https://github.com/mirrajabi/aider-github-workflows
- PR-Agent（PR comment workflow、GitHub App 安全模型可参考）
  - https://github.com/qodo-ai/pr-agent

---

## Work Objectives

### 核心目标
在单仓库内，用 GitHub primitives（Actions / Issues / PR / Labels / Checks）实现一个可审计、可恢复、可扩展的“自治交付状态机”，将需求转成一串由 Copilot coding agent 执行的 PR，并按规则自动推进。

### 具体交付物（必须可落盘）
- `.github/agent/config.yml`：宏命令、文件路径、label 名称、bot 用户名、webhook 配置等。
- `docs/agent/SPEC_TEMPLATE.md`：中文 Spec 模板。
- `docs/agent/PLAN_TEMPLATE.md`：中文 Plan 阅读模板（如何从 YAML 生成）。
- `plans/<issue-id>.yaml`：任务清单源（机器可读，含等级/依赖/状态/关联 issue/pr）。
- `plans/<issue-id>.md`：中文阅读版（从 YAML 同步生成或至少可重建）。
- `.github/workflows/*`：控制面与数据面工作流。
- `docs/agent/RUNBOOK.md`：失败恢复与运维手册（/pause /resume /retry /abort 语义）。

### Done 定义（Definition of Done）
- 在 sandbox repo 上，端到端跑通：Issue → Spec PR → merge → Plan PR → merge → 2+ tasks 子 issue → Copilot 连续产出 PR → 按 L1/L2/L3 规则合并 → 最终 Plan 状态变为 done。
- 全程无需修改生产配置；所有权限/缺失设置以“检测+提示”方式处理。
- 控制面工作流默认不 checkout PR 代码；数据面 CI 在最小权限下运行。

### Must NOT Have（范围护栏）
- 不做多仓库/跨 org 编排（MVP 单仓库）。
- 不做并行执行多个任务（严格串行）。
- 不引入外部数据库/队列/常驻服务（MVP 全靠 GitHub）。
- 不自动修改 repo 安全设置（rulesets、Actions 权限、auto-merge 开关等只能检测并提示）。
- 不允许 L1 触碰敏感目录（至少包含 `/.github/workflows/**`、`/.github/actions/**`；可在 config 里扩展）。

---

## 验证策略（沙盒 E2E + 单元测试）

### Sandbox 约定
- 建议创建一个独立 sandbox repo（例如 `ORG/agent-sandbox`），用于反复跑端到端演练。
- 在 sandbox 中启用：Copilot coding agent、auto-merge（如果要 L1 自动合并）、必要的 Actions 权限。

### 自动化验收脚本（Agent 可执行）
> 计划中的每个关键阶段都要能用 `gh`/GitHub API 轮询验证，尽量避免“人工点击确认”。

示例（执行者可在实现阶段补齐为脚本）：

```bash
# 约定：在 sandbox repo 根目录执行（gh 已认证）
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

# 1) 创建需求 issue
ISSUE_URL=$(gh issue create -R "$REPO" -t "Test: 生成 Spec" -b "请生成中文需求文档并开 PR" --json url -q .url)

# 2) 等待 Spec PR 出现（按 title/label/branch 前缀匹配）
gh pr list -R "$REPO" --search "Spec in:title is:open" --json number,author,title

# 3) 合并 Spec PR 后，等待 Plan PR
gh pr list -R "$REPO" --search "Plan in:title is:open" --json number,title

# 4) 合并 Plan PR 后，确认创建 task 子 issue
gh issue list -R "$REPO" --search "label:agent:task" --json number,title

# 5) 观察串行推进：同一时间最多 1 个 in-progress
gh issue list -R "$REPO" --search "label:agent:task label:agent:in-progress" --json number | jq 'length'
```

### 单元测试范围建议
- Plan YAML schema 校验、状态机迁移函数、命令解析（严格匹配整行）、allowlist 判定、webhook payload 组装。

---

## 架构设计（MVP）

### 实现载体与代码组织（绿地项目必须写死）

**实现方式（固定）**：Node.js（TypeScript）+ Octokit（`@actions/github` / `@octokit/rest`）
- 原因：控制面需要调用多种 GitHub API（issues/PR/checks/workflow_dispatch），用 Octokit 可读性与可维护性更高。

**建议新增目录（执行者落地时创建）**：
- `agent/`：编排核心代码（可作为 npm workspace 或简单 ts-node 脚本）
  - `agent/src/state.ts`：state comment 的读写/解析/序列化
  - `agent/src/plan.ts`：plan.yaml 解析/校验/更新（status/pr/issue 写回）
  - `agent/src/github.ts`：Octokit 封装（issues/pr/checks/workflow dispatch）
  - `agent/src/commands.ts`：ChatOps 命令严格解析（正则 + actor gating）
  - `agent/src/policies.ts`：L1 allowlist / sensitive globs / L2/L3 判定
  - `agent/src/notify.ts`：GitHub comment + webhook notifier（可插拔）

**建议新增 workflows（执行者落地时创建，名字写死便于 plan 引用）**：
- `.github/workflows/agent-intake.yml`
  - 触发：`issues: opened`
  - 动作：仅当 issue body 含需求模板 marker 时才进入；初始化 state、进入 spec、指派 Copilot
- `.github/workflows/agent-commands.yml`
  - 触发：`issue_comment: created`（必要时也支持 `pull_request_review_comment: created`）
  - 动作：处理 `/approve-task` `/pause` `/resume` `/retry` `/abort`
- `.github/workflows/agent-pr-router.yml`
  - 触发：`pull_request: opened, synchronize, closed`
  - 动作：识别 Copilot PR、绑定 task-id、触发 CI dispatch、merge 后推进 cursor
- `.github/workflows/agent-ci.yml`
  - 触发：`workflow_dispatch`
  - 动作：checkout 指定 PR head ref（只读，无 secrets），跑 lint/test，写 `agent/ci` check-run
- `.github/workflows/agent-reconcile.yml`
  - 触发：`schedule`
  - 动作：对账（只读为主，必要时仅做安全自修复），避免卡死

### PR 类型与路由规则（必须防误合并/误推进）

> `agent-pr-router.yml` 必须先判定 PR 类型，再决定“打标签/推进状态/合并门禁”。该规则是全局优先级（从上到下匹配，命中即停止）。

1) **状态更新 PR（plan 状态落盘）**
- 判定：head ref 匹配 `^agent/plan-status/`
- 规则：
  - 只允许变更 `plans/**`（否则 blocked）
  - 允许走 L1 自动合并（checks green 后 auto-merge）
  - label：`agent:status-pr`

2) **Spec PR（中文需求文档）**
- 判定：PR body 包含 `Agent-Task-Id: spec`
- 规则：
  - 永不自动合并（必须人工 PR Review merge）
  - label：`agent:spec-pr`

3) **Plan PR（plan.yaml + 中文阅读版）**
- 判定：PR body 包含 `Agent-Task-Id: plan`
- 规则：
  - 永不自动合并（必须人工 PR Review merge）
  - label：`agent:plan-pr`

4) **Task PR（Copilot 执行的任务 PR）**
- 判定：
  - PR author login 命中 `config.copilot.bot_login_allowlist`
  - head ref 前缀 `copilot/`
  - PR body 包含 `Agent-Parent-Issue: <n>` 与 `Agent-Task-Id: <task-id>`，且 `<task-id>` 存在于 `plans/<issue-id>.yaml`
- 规则：
  - 进入 L1/L2/L3 评估（基于计划 level + changed-files allowlist/sensitive 规则）
  - label：`agent:task-pr` + `agent:l1|agent:l2|agent:l3`
  - 如果 marker 缺失/不匹配/找不到 task-id：blocked（并提示 Copilot 补齐）

### L1 自动合并降级规则（固定）

- 如果 L1 PR 满足 allowlist 且 checks green，但由于 repo 未开启 auto-merge / ruleset 阻止 bot 合并 / required reviews 等原因无法合并：
  - 自动降级为 L2：
    - 给 PR 与 task issue 打上 `agent:l2` 并评论解释
    - 等待协作者在 PR 评论 `/approve-task` 后再合并
  - 不尝试自动修改 repo 设置

5) **其他 PR**
- 规则：必须忽略（不得触发任何需要 `AGENT_GH_TOKEN` 的写操作）

### 概念模型
- **控制面（Orchestrator）**：
  - 监听 issue/PR 事件，维护状态机，创建/更新子 issue，触发 Copilot 工作，更新 Plan 状态与通知。
  - 原则：默认不 checkout PR 代码；最小权限；严格可信 actor gating；幂等。
- **数据面（CI / Verification）**：
  - 对 Copilot PR 执行测试/静态检查，并产出可用于合并门禁的 checks。
  - 原则：只读权限运行；不使用 secrets；避免 `pull_request_target` checkout PR 代码。

### 鉴权与凭据模型（阻塞点：必须先定死）

> 该系统需要做的关键操作包括：指派 Copilot、创建/编辑 issue、创建/合并 PR、触发 workflow_dispatch、写入 checks。
> GitHub 文档明确：**通过 API 指派 issue 给 Copilot coding agent 需要 user token / GitHub App user-to-server token**。

**MVP 选择（默认）**：Fine-grained PAT（用户令牌）作为唯一“高权限令牌”。

- Secret：`AGENT_GH_TOKEN`
  - 类型：Fine-grained PAT（推荐）
  - 归属：某个拥有该仓库 write/maintain 权限的用户
  - 允许的最小权限（按 repo 权限粒度配置，名称可能随 GitHub UI 变化，执行者以“能完成动作”为准）：
    - Metadata：Read（官方文档要求；也用于基础 repo 探测）
    - Issues：Read and write（用于 assign Copilot / 创建子 issue / label / comment）
    - Pull requests：Read and write（用于读取 PR 状态、merge、评论）
    - Contents：Read and write（用于创建状态更新 PR/提交计划文件变更）
    - Actions：Read and write（用于 `workflow_dispatch` 触发 CI job）
    - Checks / Statuses：Read and write（用于写 check-run / status）

**低权限令牌**：`GITHUB_TOKEN`
- 用途：仅用于读取事件 payload、读取仓库元数据等；不承载“指派 Copilot / 合并 PR / 写入内容”等关键动作。

### Secrets 使用边界（必须防止在非预期事件中暴露）

- `AGENT_GH_TOKEN` 只允许在以下 workflows 使用：
  - `.github/workflows/agent-intake.yml`
  - `.github/workflows/agent-commands.yml`
  - `.github/workflows/agent-pr-router.yml`
  - `.github/workflows/agent-reconcile.yml`
- 在 `.github/workflows/agent-pr-router.yml` 中：只有当 `github.event.pull_request.user.login` 命中 `config.copilot.bot_login_allowlist` 且 `startsWith(github.event.pull_request.head.ref, 'copilot/')` 才允许读取 `AGENT_GH_TOKEN` 并执行写操作；否则必须立即 exit（防止协作者手工开 PR 触发高权限逻辑）。
- `.github/workflows/agent-ci.yml`：严格 **不使用任何 secrets**；只给最小 permissions（读 contents + 写 checks）。
- 每个 workflow 必须显式声明 `permissions:`，默认全是 read，仅在需要写入时单 job 提升。

### Copilot 指派 API（固定选型：REST）

> 目标：把某个 task issue 指派给 Copilot，让其创建 PR。

- REST endpoint：`PATCH /repos/{owner}/{repo}/issues/{issue_number}`
- Headers（固定）：
  - `Accept: application/vnd.github+json`
  - `X-GitHub-Api-Version: 2022-11-28`
- Request body（字段名按官方示例；未填字段可为空字符串）：
  - `assignees: [config.copilot.bot_assignee]`
  - `agent_assignment`：
    - `target_repo`（例如 `OWNER/REPO`）
    - `base_branch`（默认 `main`，从 config 读取）
    - `custom_instructions`
    - `custom_agent`
    - `model`
- 强制引用（稳定）：
  - https://github.com/github/docs/blob/799e3d2013dbed1419196a91adb2ec015ac0499d/content/copilot/how-tos/use-copilot-agents/coding-agent/create-a-pr.md

### 可信 actor gating（固定规则，不临场推断）

- 对 `issues` / `issue_comment`：使用事件 payload 的 `author_association`，白名单精确为：`OWNER`, `MEMBER`, `COLLABORATOR`。
- 对 `pull_request`：
  - Copilot PR 识别：`pull_request.user.login` 必须命中 `config.copilot.bot_login_allowlist` 且 head ref 前缀为 `copilot/`。
  - 除 Copilot PR 外，控制面不得在 PR 事件里执行任何需要 `AGENT_GH_TOKEN` 的写操作。

**失败行为（必须可观测）**：
- 如果 `AGENT_GH_TOKEN` 缺失或权限不足：
  - parent issue 进入 `agent:blocked`，并评论说明缺失项（例如：无法指派 Copilot / 无法触发 workflow_dispatch / 无法合并 PR）。

### 状态存储与写回策略（阻塞点：必须可执行且幂等）

**三层状态源（固定，不做临场选择）**：

1) **运行游标（runtime cursor）**：存放在 parent issue 的 machine-readable comment（JSON 块）
- 形式（固定协议，用于唯一定位 + 恢复）：
  - comment body 以固定标记开头：`<!-- agent-state:json -->`
  - JSON 必须包含：
    - `state_id`: `agent-state:<repo>:<parent_issue>`
    - `version`: number
- 内容建议：
  - `parent_issue`: number
  - `plan_path`: `plans/<issue-id>.yaml`
  - `cursor_task_id`
  - `tasks`: `{ task_id: { status, level, issue, pr, last_update } }`
  - `paused`: boolean
- 幂等/并发策略（固定）：
  - **Workflow 并发锁**：所有会写 state 的 jobs 必须配置 `concurrency`，group 以 parent issue number 为维度（例如 `agent-${{ github.repository }}-issue-${{ inputs.parent_issue || github.event.issue.number }}`），`cancel-in-progress: false`，确保同一 parent 的写入串行化。
  - **乐观版本号**：state JSON 内含 `version`（整数）。写入时读取 version=v，写回时写 v+1；写回后立即 re-fetch comment 校验 version 是否等于 v+1，否则重试（最多 3 次）。
  - 超过重试仍失败：进入 blocked，并评论“可能并发/重放导致 state 冲突”。

- state comment 定位算法（固定）：
  - 列出 parent issue 的所有 comments，筛选出包含 marker 且 JSON 中 `state_id` 匹配的 comment。
  - 若找到多条：取 `version` 最大的一条作为唯一 source（其余保留但不再写入）。
  - 若一条都找不到：创建新的 state comment（version=1）。
  - 若 JSON 解析失败：进入 blocked，并创建新的 state comment，JSON 中记录 `recovery_from_comment_id`。

2) **工作态（可见/可筛选）**：labels
- parent issue 与 task issues 都用 labels 表达粗粒度状态（pending/in-progress/blocked/done）。

3) **计划文件（source-of-truth for tasks）**：`plans/<issue-id>.yaml` + `plans/<issue-id>.md`
- 作用：任务定义与验收标准的唯一真相源（YAML）；阅读版用于审阅/沟通（中文 MD）。

**写回策略（固定）**：
- 运行时“每完成一个任务”的即时状态变更：
  - 必须先更新 parent issue 的 JSON state + labels（无需改分支保护）。
- 计划文件（YAML/MD）的状态落盘：
  - **在每个 task PR merge 后，自动创建一个“状态更新 PR”来更新 `plans/<issue-id>.yaml` 与 `plans/<issue-id>.md`**，并按 L1 allowlist 自动合并。
  - PR 分支命名：`agent/plan-status/<parent-issue>/<task-id>`（每次一个独立分支，避免长期分支冲突）。
  - PR 标题固定包含：`[agent-status] <parent-issue> <task-id>`，用于幂等查找/复用。
  - 冲突策略：如果状态 PR 无法 clean merge，则进入 blocked 并提示人工处理（MVP 不做复杂自动重放）。

### 控制面“无 checkout”读写实现路径（必须写死）

> 原则：控制面不 checkout PR head；只通过 GitHub API 读写默认分支内容与创建 PR。

- 读取计划文件（默认分支）：
  - API：Contents API（例如 Octokit `repos.getContent`）读取 `plans/<issue-id>.yaml`
- 创建/更新状态更新 PR（不 checkout）：
  - API：Git Data API 创建提交链
    - 读 base ref：`git.getRef`
    - 创建 branch：`git.createRef`
    - 创建 blob/tree/commit：`git.createBlob` → `git.createTree` → `git.createCommit`
    - 推进 ref：`git.updateRef`
  - API：`pulls.create` 创建 PR
- 判断 PR changed files（不 checkout）：
  - API：`pulls.listFiles` 分页读取文件列表

### 关键量化参数（用于可脚本验收，写死为 config 默认）

- `timeouts.spec_pr_minutes`: 20（超过则 blocked）
- `timeouts.plan_pr_minutes`: 20（超过则 blocked）
- `timeouts.task_pr_minutes`: 45（超过则 blocked）
- `timeouts.ci_minutes`: 30（超过则 blocked）
- `ci.required_check_name`: `agent/ci`（精确匹配）
- PR 分支正则：
  - Copilot 任务分支：`^copilot/`（精确前缀）
  - 状态更新分支：`^agent/plan-status/`（精确前缀）
- PR 绑定 marker（必须出现在 PR body，执行者据此绑定 task-id）：
  - `Agent-Parent-Issue: <number>`
  - `Agent-Task-Id: <task-id>`
- Webhook（MVP）签名：
  - Header：`X-Agent-Signature: sha256=<hmac>`
  - Payload 必填字段：`event_type`, `repo`, `parent_issue`, `task_id`(可空), `pr_url`(可空), `status`, `ts`

### 状态机（建议）
- Parent issue labels（示例，可配置）：
  - `agent:requested` → `agent:spec-in-progress` → `agent:spec-approved` → `agent:plan-in-progress` → `agent:plan-approved` → `agent:executing` → `agent:done` / `agent:blocked`
- Task issue labels：
  - `agent:task` + `agent:l1|agent:l2|agent:l3` + `agent:pending|agent:in-progress|agent:in-review|agent:done|agent:blocked`

### ChatOps 指令（建议，严格匹配整行）
- `/approve-task`：仅对 L2 task PR 有效；actor 必须是协作者。
- `/pause`、`/resume`：暂停/恢复派发。
- `/retry`：对当前 in-progress 任务请求 Copilot 再尝试一次（受限于重试次数）。
- `/abort`：终止流水线（保留审计记录）。

### Workflow 触发矩阵（控制面/数据面必须可追溯）

| 事件 | 触发器 | Guard 条件（必须） | 主要动作 | 主要写入 |
|---|---|---|---|---|
| 需求 intake | `issues: opened` | `author_association` ∈ {OWNER,MEMBER,COLLABORATOR}；且 issue body 含 `<!-- agent-request -->`；且不含 `<!-- agent-task -->`/`<!-- agent-probe -->` | 初始化 state；进入 spec；指派 Copilot 生成 Spec PR | parent labels + state comment + PR 链接 |
| ChatOps | `issue_comment: created` | 严格命令匹配；actor 为协作者/团队 | `/pause` `/resume` `/retry` `/abort` 等 | state comment + labels |
| PR 发现 | `pull_request: opened/synchronize` | PR author 为 Copilot bot；head ref 前缀 `copilot/` | 绑定 task-id；触发 CI（dispatch）；按 L1/L2/L3 设置合并门禁 | plan state + labels + check-run |
| L2 放行 | `issue_comment` 或 `pull_request_review_comment` | 精确命令 `/approve-task`；actor 为协作者/团队；PR 对应 L2 task | 执行 merge 或启用 auto-merge | PR 状态 + state comment |
| Task 完成推进 | `pull_request: closed`（merged） | PR 对应 task；且 checks/规则满足 | 更新 cursor；创建状态更新 PR；派发下一任务 | state comment + 状态 PR + labels |
| 对账 | `schedule` | 无（但只读/只提示） | 扫描不一致并提示/有限自修复 | issue comment + labels |

---

## 执行策略（并行波次）

Wave 1（先搭“可跑的最小闭环”）：
- 配置文件/模板/label 体系
- 前置检查 workflow
- Spec PR 生成闭环

Wave 2（Plan 与 Task 派发闭环）：
- Plan PR 生成闭环（YAML+MD 双文件）
- Plan merge 后自动生成 task 子 issue
- 串行派发任务给 Copilot（issue assignment API）

Wave 3（合并策略 + CI + 恢复/对账）：
- L1/L2/L3 合并门禁
- `copilot/**` PR 自动 CI 验证方案
- 失败恢复（CI 红/超时/无 PR）+ 定时 reconciliation
- webhook 通知实现与可扩展接口

---

## TODOs

> 说明：本仓库当前是绿地（没有任何 workflows）。以下任务以“从 0 建立 GitHub-native 控制面/数据面”为主。

- [ ] 0. 前置能力探测与约束清单（Fail-fast）

  **要做什么**：
  - 设计并实现一个“前置检查”步骤（可在 Actions 中运行）：
    - Copilot coding agent 是否可用（能否 assign issue 给 `copilot-swe-agent[bot]` 并触发工作）。
    - repo 是否允许 auto-merge（若依赖 L1 自动合并）。
    - Actions workflow permissions 是否满足（issues/PR/comments/checks）。
  - 产出 `docs/agent/PREREQUISITES.md`：列出必须开启/配置的仓库设置与原因。

  **必须不做**：
  - 不自动修改任何 repo 设置（只检测并在 issue/PR 评论里提示）。

  **参考**：
  - https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-a-pr
  - https://github.blog/changelog/2025-12-03-assign-issues-to-copilot-using-the-api/

  **验收标准**：
  - 在 sandbox repo 执行一次 workflow，输出“通过/失败原因”并落到 job summary + parent issue comment。
  - Copilot 可用性的判据必须可复现且量化（固定）：
    - 创建一个 probe issue（body 含 `<!-- agent-probe -->` 且 label `agent:probe`，确保不会被 intake 当成真实需求），用 `AGENT_GH_TOKEN` assign 给 Copilot，指令为“仅修改一个 docs 文件并开 PR，PR body 必须包含 marker”。
    - 在 `timeouts.spec_pr_minutes`（默认 20 分钟）内出现满足条件的 PR 即 PASS；否则进入 blocked 并输出明确原因（超时/403/422/未启用）。
  - “无需人工 Approve workflows”的判据（固定）：
    - 对 probe PR，控制面能自动触发 `.github/workflows/agent-ci.yml` 并在 `timeouts.ci_minutes` 内产生 check-run `agent/ci`
    - 若无法产生（例如 dispatch 被限制/未运行）：进入 blocked，并评论“当前仓库无法实现全自动 CI；需要调整 Actions 设置或接受人工批准”

- [ ] 1. 定义配置文件与标签体系（可配置 + 可审计）

  **要做什么**：
  - 设计 `.github/agent/config.yml`（非敏感）：
    - bot 用户名（默认 `copilot-swe-agent[bot]`）、宏命令、label 名称、敏感路径列表、allowlist 规则、文件路径（spec/plan）、webhook 开关等。
  - 设计 label taxonomy（parent issue + task issue + PR 状态标签）。
  - 写 `docs/agent/CONFIG.md`：配置字段说明与示例。

  **验收标准**：
  - `.github/agent/config.yml` 至少包含以下字段（可扩展，但这些是 MVP 必需）：
    - `copilot.bot_assignee`（默认 `copilot-swe-agent[bot]`，用于 REST assign）
    - `copilot.bot_login_allowlist`（默认包含 `copilot-swe-agent` 与 `copilot-swe-agent[bot]`，用于事件匹配）
    - `paths.spec_dir`、`paths.plan_yaml_dir`、`paths.plan_md_dir`
    - `labels.parent.*`、`labels.task.*`
    - `merge_policy.l1.allowlist_globs`、`merge_policy.sensitive_globs`
    - `ci.mode`（固定 `dispatch`）+ `ci.workflow` + `ci.required_check_name`
    - `notifications.github.enabled`、`notifications.webhook.enabled`、`notifications.webhook.secret_name`
  - 提供一份可机器校验的 schema（例如 `docs/agent/config.schema.json` 或等价机制），并在 CI 中对 config 做校验（校验失败则 workflow 直接失败）。
  - labels 能被自动化创建/校验：在 sandbox repo 运行后，`gh label list -R "$REPO"` 能看到计划中定义的核心 labels。

- [ ] 1.5 Labels Bootstrap（幂等初始化入口写死）

  **要做什么**：
  - 增加固定的 bootstrap 入口：`.github/workflows/agent-bootstrap.yml`（`workflow_dispatch`）读取 `.github/agent/config.yml` 并幂等创建 labels。
  - 幂等规则：label 已存在则跳过；存在但颜色/描述不一致则更新。

  **验收标准**：
  - 在空 labels 的 sandbox repo 执行 bootstrap 后，核心 labels 全部存在。
  - 重复执行 bootstrap 不会产生错误或重复对象。

- [ ] 2. 增加中文模板：Spec 与 Plan（双文件）

  **要做什么**：
  - 增加 `docs/agent/SPEC_TEMPLATE.md`（中文）：包含范围边界、验收标准、非目标、风险、回滚。
  - 增加 `docs/agent/PLAN_TEMPLATE.md`（中文）：说明如何从 plan.yaml 生成阅读版，以及任务等级规则。
  - 定义 `plans/<issue-id>.yaml` 的 schema（字段：id、title、level、deps、status、issue、pr、acceptance、notes）。
  - 定义 `plans/<issue-id>.md` 的生成规则（必须与 YAML 一致，至少包含 task 列表+状态）。

  **验收标准**：
  - `docs/agent/SPEC_TEMPLATE.md` 至少包含并保持固定标题（便于 Copilot 生成时对齐）：
    - `## 背景与目标` `## 范围（包含/不包含）` `## 用户故事/使用场景` `## 验收标准` `## 风险与回滚` `## 非目标`
  - `plans/<issue-id>.yaml` schema 至少包含字段：`tasks[].id/title/level/deps/status/issue/pr/acceptance`。
  - `plans/<issue-id>.md` 阅读版至少包含：任务总数、每个任务的 `id/level/status`、关联 issue/PR 链接。
  - `plans/<issue-id>.md` 渲染规范（固定，必须可重建）：
    - 文件头：`# 执行计划（Issue #<n>）`
    - `## 元信息`：包含 parent issue 链接、当前总状态、最后更新时间
    - `## 任务列表`：按 YAML 原顺序输出，必须包含表格列：`id` `level` `status` `issue` `pr` `acceptance`
    - `status` 枚举固定为：`pending | in-progress | in-review | blocked | done | cancelled`
    - 规则：MD 永远由 YAML 生成覆盖（禁止手工编辑）；状态更新 PR 中同时更新 YAML 与 MD
  - 强制一致性（固定）：
    - 提供一个生成入口（例如 `agent render-plan-md --plan plans/<issue-id>.yaml --out plans/<issue-id>.md`）
    - 在 CI/校验 workflow 中执行“重新生成 MD 并 diff”，若有差异则失败（保证 MD 可重建且不会漂移）
  - 提供 plan schema 校验（例如 `docs/agent/plan.schema.json`），并在 CI 中校验 YAML（校验失败 workflow 失败）。
  - 计划文件可 round-trip：自动化更新 task 的 `status/pr` 不会破坏 schema（执行者用单元测试覆盖该更新函数）。

- [ ] 2.5 需求/任务/探测 Issue 模板（marker 注入，避免递归）

  **要做什么**：
  - 增加需求 Issue 模板（例如 `.github/ISSUE_TEMPLATE/agent-request.md` 或 issue form）：
    - issue body 必须自动包含 marker：`<!-- agent-request -->`
    - 包含字段：背景/目标、范围（包含/不包含）、验收标准、约束/禁止项
  - 约定并实现：系统创建的 task 子 issue 必须包含 marker `<!-- agent-task -->`，且不得包含 `<!-- agent-request -->`。
  - 约定并实现：probe issue 必须包含 marker `<!-- agent-probe -->`（用于前置检查，避免污染主状态机）。

  **验收标准**：
  - 需求 issue 打开后，`agent-intake` 仅对包含 `<!-- agent-request -->` 的 issue 生效。
  - 系统生成的 task 子 issue 不会触发 intake。

- [ ] 3. 控制面：需求 intake 与 Spec PR 生成闭环

  **要做什么**：
  - 触发方式（固定，不再二义）：`issues: opened` + 需求 issue template 注入 marker `<!-- agent-request -->`。
  - 实现 workflow：
    - 仅处理协作者/团队作者（`author_association` 白名单：OWNER/MEMBER/COLLABORATOR）。
    - 给 parent issue 进入 `spec-in-progress` 状态。
    - 调用 REST API（见“Copilot 指派 API”）把 issue 分配给 Copilot，并注入“生成中文 Spec 文件并开 PR”的明确指令（固定模板，避免 prompt 注入）。
    - 指令必须要求 Copilot 在 PR body 写入：
      - `Agent-Parent-Issue: <number>`
      - `Agent-Task-Id: spec`

  **必须不做**：
  - 不接受外部用户输入触发。
  - 不把 issue 的自然语言直接拼成 shell 命令。

  **参考**：
  - Copilot issue assignment：
    - https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-a-pr
  - 可信作者门禁模式（OpenHands 工作流实现参考）：
    - https://github.com/OpenHands/OpenHands/blob/main/.github/workflows/openhands-resolver.yml

  **验收标准（E2E）**：
  - 创建一个需求 issue 后，系统在 `timeouts.spec_pr_minutes` 内出现 Spec PR；PR 中新增/更新中文 spec 文件。
  - PR body 包含 marker（用于后续稳定绑定）。

- [ ] 4. 控制面：Spec merge 后自动生成 Plan PR（YAML + 中文阅读版）

  **要做什么**：
  - 在 Spec PR merge 事件上推进状态到 `plan-in-progress`。
  - 通过同样的 issue assignment 触发 Copilot 生成：
    - `plans/<issue-id>.yaml`
    - `plans/<issue-id>.md`（中文阅读版）
  - 要求 Copilot 在 PR 描述中包含：任务数量、每条任务的 level 与验收标准。

  **验收标准（E2E）**：
  - 合并 Spec PR 后，出现 Plan PR；Plan PR 包含 YAML + MD 两个文件。
  - Plan PR body 包含 marker：
    - `Agent-Parent-Issue: <number>`
    - `Agent-Task-Id: plan`

- [ ] 5. 控制面：Plan merge 后创建 task 子 Issue（一任务一 issue）

  **要做什么**：
  - 读取 `plans/<issue-id>.yaml`，为每个任务创建子 issue（若不存在则创建；存在则复用，幂等）。
  - 子 issue 标题/内容必须包含（用于幂等与绑定）：
    - `Agent-Parent-Issue: <number>`
    - `Agent-Task-Id: <task-id>`
    - marker：`<!-- agent-task -->`
    - level、验收标准、plan 路径
  - 幂等判定（固定）：
    - 不依赖 Search API（避免索引延迟）：
      - 先用 REST 列出 `label:agent:task` 的 issues（分页），在本地解析 body marker `Agent-Parent-Issue/Agent-Task-Id` 匹配
      - 若找到则复用；找不到才创建
  - 更新 plan.yaml/plan.md：
    - 使用“状态更新 PR”策略把 child issue 编号/链接写回（分支 `agent/plan-status/<parent-issue>/link-issues`，PR 标题含 `[agent-status]`，确保可复用）。

  **验收标准**：
  - Plan 合并后，子 issue 数量与任务数一致。
  - 重放 workflow 不会重复创建同一任务的 issue（幂等）。

- [ ] 6. 控制面：串行派发任务给 Copilot（issue assignment）

  **要做什么**：
  - 维护一个“运行游标”（cursor）：当前执行到哪个 task-id。
  - 同一时间只允许 1 个任务处于 `in-progress`。
  - 对下一个 pending task：把对应子 issue assign 给 Copilot，并注入固定指令模板（引用任务验收标准、限制范围、要求 PR body 包含 marker 绑定 task-id）。
  - 监听 PR 创建：把 PR 与 task-id 绑定（更新 plan.yaml）。

  **绑定规则（固定，避免标题被改导致误判）**：
  - 仅使用 PR body marker 绑定：`Agent-Parent-Issue` 与 `Agent-Task-Id`。
  - 若 marker 缺失或不匹配：进入 blocked，并在 PR 与 parent issue 评论提示 Copilot 重新生成/补齐。

  **验收标准（E2E）**：
  - Plan 合并后，系统自动把第一个任务分配给 Copilot，并出现 task PR。
  - 合并第一个任务 PR 后，系统自动推进到第二个任务。

- [ ] 7. 数据面：实现 `copilot/**` PR 的自动 CI 验证（最小权限、可重复）

  **要做什么（固定方案，不做运行时分支选择）**：
  - 一律采用 **控制面触发 `workflow_dispatch`** 的方式启动 CI（避免依赖 Copilot PR 是否自动触发工作流）。
  - CI workflow（例如 `.github/workflows/agent-ci.yml`）：
    - `on: workflow_dispatch`，输入参数包含：`pr_number`、`head_sha`、`head_ref`
    - `permissions` 只给只读（`contents: read`、`pull-requests: read`）+ 写 checks（`checks: write`）
    - 不使用任何 secrets
    - checkout PR head ref（只读 token）
    - 运行项目的 lint/test 命令（由 config 指定）
    - 写入一个固定名称的 check-run（例如 `agent/ci`），供 ruleset 作为 required check
    - 入口参数校验（固定，防误跑）：
      - CI 内部先 `GET /pulls/{pr_number}` 校验 `head.sha == inputs.head_sha` 且 `head.ref == inputs.head_ref`
      - 校验失败：直接失败并写 check-run，避免跑错代码/污染状态
  - 控制面在 PR opened/synchronize 时：解析出 PR 的 `head.sha` 与 `head.ref` 并 dispatch CI。
    - 数据来源（固定）：`pull_request` 事件 payload 的 `pull_request.head.sha` 与 `pull_request.head.ref`。
    - dispatch 参数：`pr_number`, `head_sha`, `head_ref`。
  - 明确禁止在 `pull_request_target` 中 checkout PR 代码执行（避免提权通道）。

  **验收标准（E2E）**：
  - 对 copilot PR，CI 能自动启动并产生可用于 ruleset 的 checks，且 check-run 名称精确为 `agent/ci`。
  - CI 失败时，流水线进入 blocked 且不会推进下一个 task。

- [ ] 8. 合并策略实现：L1/L2/L3 规则与敏感路径护栏

  **要做什么**：
  - 定义 allowlist：哪些文件/目录允许 L1（docs/tests/纯文本等）；敏感目录强制 L3。
  - 实现 PR 分类校验：如果 PR 实际改动触碰非 allowlist，则禁止按 L1 自动合并（升级到 L2/L3 或直接阻断并评论原因）。
  - changed-files 判定算法（固定，不 checkout）：
    - 数据来源：REST API `GET /repos/{owner}/{repo}/pulls/{pull_number}/files`（分页读取）。
    - 输入：`filename`（以及 `status == renamed` 时的 `previous_filename`）。
    - 边界条件（固定）：
      - 若 changed files 数量 > 300：直接升级为 L3（避免 glob 误判与风险扩大）。
      - 若命中 `merge_policy.sensitive_globs` 任意一条：直接升级为 L3。
      - 若全部命中 `merge_policy.l1.allowlist_globs`：可判定为 L1（但不得低于 Plan 中声明的 level）。
      - 其他情况：判定为 L2。
    - 输出：写入 PR comment（说明判定结果与命中的规则），并设置 PR labels（例如 `agent:l1|l2|l3`）。
  - L1：checks green 后自动合并（需 repo 开启 auto-merge 或由 bot 合并）。
    - 若无法自动合并：按“L1 自动合并降级规则”降级为 L2。
  - L2：checks green 后等待 `/approve-task`（严格命令匹配 + actor 门禁），触发合并。
  - L3：等待 PR Review 满足 ruleset（可选 CODEOWNERS）；满足后合并。

  **验收标准**：
  - L1 PR（仅 allowlist 变更）能自动合并。
  - L2 PR 没有 `/approve-task` 不合并；发出命令后合并。
  - L3 PR 在缺少 review 时不合并。

- [ ] 9. 失败恢复与定时对账（reconciliation）

  **要做什么**：
  - 处理常见失败：
    - Copilot 未产出 PR（超时）。
    - CI 红。
    - PR 冲突/不可合并。
  - 定义 `/retry` `/pause` `/resume` `/abort` 行为。
  - 增加定时对账 workflow：扫描 plan.yaml 与实际 issue/PR 状态不一致时，自动评论提示并可选自修复（只在安全情况下）。

  **验收标准**：
  - 人为制造 CI 失败后，流水线进入 blocked；执行 `/retry` 后能重新请求 Copilot 修复一次；仍失败则保持 blocked。
  - 定时对账能发现“plan.yaml 显示 in-progress 但 PR 已 merged”并修正。

- [ ] 10. 通知系统（GitHub + webhook，可扩展）

  **要做什么**：
  - 在关键事件点发通知：Spec PR 创建、Spec merge、Plan PR 创建、Plan merge、task PR 创建/合并、blocked/done。
  - GitHub 通知：用 issue/PR comment + labels + check-run。
  - webhook：读取 config + secrets，发送结构化 JSON payload（事件类型、链接、task-id、状态、时间）。
  - 预留扩展：未来 Slack/飞书/企业微信可以只扩展 notifier 模块而不改状态机。

  **验收标准**：
  - webhook 在 sandbox 中可被接收，并满足：
    - HTTP 200/2xx
    - Header 包含 `X-Agent-Signature: sha256=...`
    - JSON payload 至少包含字段：`event_type`, `repo`, `parent_issue`, `status`, `ts`（以及可选的 `task_id`, `pr_url`）

---

## Commit Strategy（建议）
- 1) `chore(agent): add config, templates, labels docs`
- 2) `feat(agent): add spec and plan generation workflows`
- 3) `feat(agent): add task dispatch + status machine`
- 4) `feat(agent): add copilot pr CI + merge gates`
- 5) `feat(agent): add reconciliation + webhook notifications`

---

## Success Criteria（最终验收）
- 在 sandbox repo 完整跑通至少 2 个任务的串行交付（含 L1 与 L2 各 1 个）。
- 整个流程审计清晰：每个阶段有 PR/issue 链接，plan.yaml 与阅读版一致。
- 失败可恢复：CI 失败/超时不会让系统“悄悄卡死”，有明确 blocked 状态与恢复指令。
