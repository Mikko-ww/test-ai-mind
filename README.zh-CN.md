# GitHub 自治代理系统

[简体中文](README.zh-CN.md) | [English](README.md)

一个 GitHub 原生的自治代理，使用 GitHub Copilot 自动化 Issue → Spec → Plan → Implementation（问题 → 规格 → 计划 → 实现）的工作流。

## 🎉 状态：100% 完成 (13/13 任务)

GitHub 自治代理已**功能完备**，可以部署到生产环境！

### ✅ 所有功能已实现

- ✅ **核心编排**：Issue 接收 → 规格 (Spec) → 计划 (Plan) → 任务分发
- ✅ **Copilot 集成**：通过 GitHub Copilot 自动生成代码
- ✅ **CI 验证**：自动化测试和验证
- ✅ **合并策略**：基于风险的 L1/L2/L3 合并策略
- ✅ **故障恢复**：ChatOps 命令和状态协调
- ✅ **状态管理**：版本锁定的状态跟踪
- ✅ **安全性**：受信任的操作者门控和最小权限原则

## 📖 目录

- [特性](#-特性)
- [架构](#%EF%B8%8F-架构)
- [安装](#-安装)
- [配置](#%EF%B8%8F-配置)
- [使用](#-使用)
- [工作流](#-工作流)
- [ChatOps 命令](#-chatops-命令)
- [合并策略](#-合并策略)
- [故障排除](#-故障排除)
- [安全性](#-安全性)
- [许可证](#-许可证)

## ✨ 特性

### 核心能力

1. **自动化需求处理**
   - 通过 GitHub Issues 提交需求
   - 自动生成中文规格说明书
   - 创建结构化的计划并拆分任务

2. **智能任务编排**
   - 串行任务执行与依赖管理
   - 自动将任务分配给 GitHub Copilot
   - 带有版本锁定的状态跟踪

3. **基于风险的合并策略**
   - **L1 (低风险)**：文档、测试和白名单文件自动合并
   - **L2 (中风险)**：需要命令批准 (`/approve-task`)
   - **L3 (高风险)**：敏感变更需要完整的 PR 审查

4. **故障恢复**
   - 用于手动控制的 ChatOps 命令
   - 定时协调（每 6 小时）
   - 自动重试机制

5. **全面通知**
   - 每个状态转换时的 GitHub 评论
   - 基于标签的可视化状态跟踪
   - CI 状态的 Check-runs

## 🏗️ 架构

### 系统概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户提交 Issue                            │
│                    (Agent Request 模板)                          │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    agent-intake.yml                              │
│  • 验证受信任的操作者                                            │
│  • 初始化状态                                                    │
│  • 分配给 Copilot 生成 Spec                                      │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Copilot 生成 Spec PR                          │
│  • 中文规格说明书                                                │
│  • 包含：背景、范围、验收标准                                    │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              用户审查并合并 Spec PR                              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    agent-pr-router.yml                           │
│  • 检测 Spec PR 合并                                             │
│  • 分配给 Copilot 生成 Plan                                      │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Copilot 生成 Plan PR                          │
│  • YAML 计划 (机器可读)                                          │
│  • 中文 Markdown (人类可读)                                      │
│  • 带有风险等级的任务拆分                                        │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              用户审查并合并 Plan PR                              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  agent-task-creator.yml                          │
│  • 为每个任务创建子 Issue                                        │
│  • 更新计划中的 Issue 编号                                       │
│  • 幂等操作                                                      │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  agent-task-dispatcher.yml                       │
│  • 分配第一个任务给 Copilot                                      │
│  • 强制串行执行                                                  │
│  • 检查依赖关系                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Copilot 生成 Task PR                          │
│  • 实现代码                                                      │
│  • 测试和文档                                                    │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│          agent-ci.yml + agent-merge-policy.yml                   │
│  • 运行 CI 验证                                                  │
│  • 评估合并策略 (L1/L2/L3)                                       │
│  • 自动合并或等待批准                                            │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Task PR 合并                                  │
│  • 调度器分配下一个任务                                          │
│  • 重复直到所有任务完成                                          │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    所有任务完成                                  │
│  • 父 Issue 标记为完成                                           │
│  • 发送通知                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 目录结构

```
.github/
├── agent/
│   └── config.yml                      # 主配置
├── workflows/
│   ├── agent-bootstrap.yml             # 标签初始化
│   ├── agent-intake.yml                # Issue 接收
│   ├── agent-pr-router.yml             # PR 路由
│   ├── agent-task-creator.yml          # 任务创建
│   ├── agent-task-dispatcher.yml       # 任务调度
│   ├── agent-ci.yml                    # CI 验证
│   ├── agent-merge-policy.yml          # 合并策略
│   ├── agent-commands.yml              # ChatOps 命令
│   └── agent-reconcile.yml             # 协调/修复
├── scripts/                            # 外部工作流脚本
│   ├── lib/                            # 共享库
│   │   ├── github-client.js            # GitHub API 封装
│   │   ├── config-loader.js            # 配置加载器
│   │   ├── state-manager.js            # 状态管理
│   │   └── utils.js                    # 实用函数
│   ├── package.json                    # 脚本依赖
│   ├── dispatch-task.js                # 任务调度器
│   ├── create-tasks.js                 # 任务创建
│   ├── evaluate-merge-policy.js        # 合并策略评估
│   └── ... (另外 16 个工作流脚本)
└── ISSUE_TEMPLATE/
    ├── config.yml
    └── agent-request.yml               # 需求模板

docs/agent/
├── CONFIG.md                           # 配置指南
├── config.schema.json                  # 配置验证
├── SPEC_TEMPLATE.md                    # Spec 模板 (中文)
├── PLAN_TEMPLATE.md                    # Plan 模板 (中文)
├── plan.schema.json                    # Plan 验证
└── plan.example.yaml                   # 计划示例

agent/
├── package.json                        # Node.js 依赖
├── tsconfig.json                       # TypeScript 配置
├── .eslintrc.json                      # ESLint 配置
└── src/
    └── state.ts                        # 状态管理

plans/                                  # 生成的计划 (YAML + MD)
```

## 📦 安装

###前提条件

1. **GitHub Copilot**
   - 为您的仓库启用 GitHub Copilot
   - 确保 Copilot coding agent 可用

2. **仓库设置**
   - 启用 Actions 的读/写权限
   - 启用自动合并 (可选，用于 L1 自动合并)
   - 配置分支保护规则 (可选)

3. **细粒度个人访问令牌 (PAT)**
   - 创建一个具有以下权限的细粒度 PAT：
     - **Metadata**: Read (必须)
     - **Issues**: Read and write
     - **Pull requests**: Read and write
     - **Contents**: Read and write
     - **Actions**: Read and write
     - **Checks**: Read and write

### 分步安装

#### 1. 克隆或复制文件

将此仓库的所有文件复制到您的目标仓库：

```bash
# 克隆此仓库
git clone <this-repo-url>

# 复制到您的目标仓库
cp -r .github /path/to/your/repo/
cp -r docs /path/to/your/repo/
cp -r agent /path/to/your/repo/
```

#### 2. 配置 Secrets

将以下 Secret 添加到您的仓库：

```bash
# 导航至：Settings → Secrets and variables → Actions → New repository secret

# 必需：
AGENT_GH_TOKEN=<your-fine-grained-pat>

# 可选 (用于 webhook 通知)：
AGENT_WEBHOOK_URL=<your-webhook-endpoint>
AGENT_WEBHOOK_SECRET=<your-webhook-secret>
```

#### 3. 安装依赖

```bash
cd agent
npm install
```

#### 4. 初始化标签

运行引导工作流以创建所有必需的标签：

```bash
# 使用 GitHub CLI
gh workflow run agent-bootstrap.yml

# 或者通过 GitHub UI 手动触发：
# Actions → agent-bootstrap → Run workflow
```

#### 5. 验证安装

检查所有标签是否已创建：

```bash
gh label list
```

您应该看到如下标签：
- `agent:requested`
- `agent:spec-in-progress`
- `agent:plan-in-progress`
- `agent:executing`
- `agent:done`
- `agent:blocked`
- `agent:task`
- `agent:l1`, `agent:l2`, `agent:l3`
- 等等。

## ⚙️ 配置

### 基本配置

编辑 `.github/agent/config.yml` 以自定义代理行为：

```yaml
copilot:
  bot_assignee: "copilot-swe-agent[bot]"
  base_branch: "main"

paths:
  spec_dir: "docs/specs"
  plan_yaml_dir: "plans"
  plan_md_dir: "plans"

merge_policy:
  l1:
    allowlist_globs:
      - "docs/**"
      - "*.md"
      - "tests/**"
  sensitive_globs:
    - ".github/workflows/**"
    - "**/*.yml"
    - "package.json"

ci:
  commands:
    lint: "npm run lint"
    test: "npm test"

timeouts:
  spec_pr_minutes: 20
  plan_pr_minutes: 20
  task_pr_minutes: 45
  ci_minutes: 30
```

### 高级配置

查看 [`docs/agent/CONFIG.md`](docs/agent/CONFIG.md) 获取详细的配置选项。

## 🚀 使用

### 提交需求

1. **创建一个新 Issue**
   - 转到 Issues → New Issue
   - 选择 "Agent Request" 模板

2. **填写表单**
   - **背景**：描述背景和动机
   - **范围**：应包含/排除的内容
   - **验收标准**：如何验证完成
   - **约束**：任何限制或要求

3. **提交 Issue**
   - 代理将自动：
     - 初始化状态跟踪
     - 分配给 Copilot 生成 Spec
     - 在 20 分钟内创建 Spec PR

### 审查 Spec PR

1. **等待 Spec PR**
   - Copilot 将创建一个包含中文规格说明书的 PR
   - PR 标题：`[Spec] Issue #<number>: <description>`

2. **审查规格**
   - 检查背景和目标
   - 验证范围边界
   - 验证验收标准
   - 确保风险已识别

3. **合并 Spec PR**
   - 一旦批准，合并 PR
   - 代理将自动生成 Plan PR

### 审查 Plan PR

1. **等待 Plan PR**
   - Copilot 将创建一个包含 YAML + 中文 Markdown 的 PR
   - PR 标题：`[Plan] Issue #<number>: <description>`

2. **审查计划**
   - 检查任务拆分 (建议 3-8 个任务)
   - 验证风险等级 (L1/L2/L3)
   - 验证依赖关系
   - 审查每个任务的验收标准

3. **合并 Plan PR**
   - 一旦批准，合并 PR
   - 代理将自动：
     - 为每个任务创建子 Issue
     - 开始向 Copilot 分发任务

### 监控执行

1. **跟踪进度**
   - 父 Issue 显示当前状态
   - 任务子 Issue 显示个人进度
   - 标签直观显示状态

2. **查看状态**
   - 检查父 Issue 评论中的状态 JSON
   - 显示当前任务、版本和状态

3. **监控 PR**
   - 每个任务生成一个 PR
   - CI 自动运行
   - 评估合并策略

### 处理任务 PR

#### L1 任务 (自动合并)
- CI 自动运行
- 如果所有检查通过，PR 自动合并
- 无需手动操作

#### L2 任务 (命令批准)
- CI 自动运行
- 等待检查通过
- 评论 `/approve-task` 以合并
- 批准后 PR 合并

#### L3 任务 (全面审查)
- CI 自动运行
- 需要完整的 PR 审查
- 遵循您的正常审查流程
- 批准后合并

## 🔄 工作流

### 完整工作流图

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. 用户提交 Issue (Agent Request 模板)                           │
│    • 背景、范围、验收标准                                        │
│    • 标记：<!-- agent-request -->                                │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. agent-intake.yml 触发                                         │
│    • 验证：仅限 OWNER/MEMBER/COLLABORATOR                        │
│    • 创建状态评论 (版本 1)                                       │
│    • 添加标签：agent:spec-in-progress                            │
│    • 分配给 Copilot 并提供自定义指令                             │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. Copilot 生成 Spec PR (20分钟内)                               │
│    • 文件：docs/specs/issue-<N>.md                               │
│    • 中文规格说明书                                              │
│    • 标记：Agent-Parent-Issue, Agent-Task-Id: spec               │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. 用户审查并合并 Spec PR                                        │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 5. agent-pr-router.yml 检测 Spec 合并                            │
│    • 更新标签：agent:spec-approved, agent:plan-in-progress       │
│    • 分配给 Copilot 生成 Plan                                    │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 6. Copilot 生成 Plan PR (20分钟内)                               │
│    • 文件：plans/issue-<N>.yaml + plans/issue-<N>.md             │
│    • 带有等级和依赖的任务拆分                                    │
│    • 标记：Agent-Parent-Issue, Agent-Task-Id: plan               │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 7. 用户审查并合并 Plan PR                                        │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 8. agent-task-creator.yml 触发                                   │
│    • 读取 plans/issue-<N>.yaml                                   │
│    • 为每个任务创建子 Issue (幂等)                               │
│    • 更新计划中的 Issue 编号                                     │
│    • 创建状态 PR 以持久化更改                                    │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 9. agent-task-dispatcher.yml 触发                                │
│    • 检查：一次仅进行 1 个任务                                   │
│    • 验证依赖已满足                                              │
│    • 分配下一个待处理任务给 Copilot                              │
│    • 更新带有游标的状态                                          │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 10. Copilot 生成 Task PR (45分钟内)                              │
│     • 实现代码                                                   │
│     • 测试和文档                                                 │
│     • 标记：Agent-Parent-Issue, Agent-Task-Id: <task-id>         │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 11. agent-pr-router.yml 检测 Task PR                             │
│     • 触发 agent-ci.yml (workflow_dispatch)                      │
│     • 触发 agent-merge-policy.yml                                │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 12. agent-ci.yml 运行                                            │
│     • 验证 PR 参数                                               │
│     • 运行：npm run lint, npm test                               │
│     • 创建 check-run: agent/ci                                   │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 13. agent-merge-policy.yml 评估                                  │
│     • 分析变更文件                                               │
│     • 计算等级：L1/L2/L3                                         │
│     • L1：如果 CI 绿色则自动合并                                 │
│     • L2：等待 /approve-task                                     │
│     • L3：等待 PR 审查                                           │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 14. Task PR 合并                                                 │
│     • agent-task-dispatcher.yml 再次触发                         │
│     • 分配下一个任务给 Copilot                                   │
│     • 重复步骤 10-14 直到所有任务完成                            │
└────────────────────────┬─────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│ 15. 所有任务完成                                                 │
│     • 父 Issue 标记为：agent:done                                │
│     • 添加通知评论                                               │
│     • 工作流完成                                                 │
└──────────────────────────────────────────────────────────────────┘
```

## 💬 ChatOps 命令

在 Issue 或 PR 评论中使用这些命令来控制代理：

### `/approve-task`

**目的**：批准并合并 L2 任务 PR

**用法**：
```
/approve-task
```

**要求**：
- 必须在 PR 上使用 (不是 Issue)
- PR 必须有 `agent:l2` 标签
- CI 检查必须已通过
- 用户必须是 OWNER/MEMBER/COLLABORATOR

**示例**：
```
更改看起来不错。CI 是绿色的。

/approve-task
```

### `/pause`

**目的**：暂停任务分发

**用法**：
```
/pause
```

**效果**：
- 向父 Issue 添加 `agent:paused` 标签
- 停止调度器分配新任务
- 当前进行中的任务继续

**用例**：需要暂时暂停自动化

### `/resume`

**目的**：恢复任务分发

**用法**：
```
/resume
```

**效果**：
- 移除 `agent:paused` 标签
- 触发调度器继续
- 分配下一个待处理任务

**用例**：暂停后恢复

### `/retry`

**目的**：重试当前任务 (未来实现)

**用法**：
```
/retry
```

**效果**：
- 重新分配当前任务给 Copilot
- 增加重试计数器
- 最大重试次数：2 (可配置)

**用例**：Copilot 未能生成 PR 或 PR 有问题

### `/abort`

**目的**：中止整个管道

**用法**：
```
/abort
```

**效果**：
- 添加 `agent:blocked` 标签
- 停止所有任务分发
- 保留审计跟踪

**用例**：需要完全停止自动化

## 🔒 合并策略

### L1: 低风险 (自动合并)

**标准**：
- 所有更改的文件匹配白名单模式
- CI 检查通过
- 未触及敏感文件

**白名单模式** (默认)：
- `docs/**`
- `*.md`
- `tests/**`
- `**/*.test.js`
- `**/*.test.ts`
- `**/*.spec.js`
- `**/*.spec.ts`
- `plans/**`

**行为**：
- CI 绿色时自动合并
- 无需人工批准
- 如果自动合并失败，降级为 L2

**示例**：
```
更改的文件：
✓ docs/api.md → docs/** (白名单)
✓ README.md → *.md (白名单)
✓ tests/unit.test.js → tests/** (白名单)

结果：L1 - 启用自动合并
```

### L2: 中风险 (命令批准)

**标准**：
- 包含白名单以外的文件
- 未触及敏感文件
- CI 检查通过

**行为**：
- 等待 `/approve-task` 命令
- 需要 OWNER/MEMBER/COLLABORATOR
- 收到命令后合并

**示例**：
```
更改的文件：
✓ docs/api.md → docs/** (白名单)
⚠️ src/utils.js → 不在白名单中
✓ tests/utils.test.js → tests/** (白名单)

结果：L2 - 需要 /approve-task 命令
```

### L3: 高风险 (全面审查)

**标准**：
- 包含敏感文件
- 或更改超过 300 个文件
- 需要完整的 PR 审查

**敏感模式** (默认)：
- `.github/workflows/**`
- `.github/actions/**`
- `**/*.yml`
- `**/*.yaml`
- `package.json`
- `package-lock.json`
- `Dockerfile`
- `.env*`
- `**/*secret*`
- `**/*credential*`
- `**/*token*`

**行为**：
- 需要完整的 PR 审查批准
- 遵循分支保护规则
- 可能需要 CODEOWNERS 批准

**示例**：
```
更改的文件：
✓ docs/api.md → docs/** (白名单)
❌ .github/workflows/ci.yml → .github/workflows/** (敏感)

结果：L3 - 需要完整的 PR 审查
```

### 策略降级

如果 L1 自动合并失败 (例如：仓库未启用自动合并)：
- 自动降级为 L2
- 添加评论解释降级原因
- 相应更新标签

## 🔧 故障排除

### 常见问题

#### 1. Copilot 不生成 PR

**症状**：
- 20多分钟后没有出现 Spec/Plan/Task PR
- 父 Issue 卡在 `spec-in-progress` 或 `plan-in-progress`

**解决方案**：
- 验证仓库已启用 GitHub Copilot
- 检查 `AGENT_GH_TOKEN` 是否有正确权限
- 验证令牌可以将 Issue 分配给 `copilot-swe-agent[bot]`
- 检查工作流日志中的 API 错误

**调试**：
```bash
# 检查 Copilot 是否已分配
gh issue view <issue-number>

# 检查工作流运行
gh run list --workflow=agent-intake.yml
gh run view <run-id> --log
```

#### 2. CI 未运行

**症状**：
- Task PR 已创建但没有出现 CI check-run
- PR 卡住，没有 `agent/ci` 检查

**解决方案**：
- 验证 Actions 权限设置为读/写
- 检查 `agent-ci.yml` 工作流是否存在
- 验证 `agent-pr-router.yml` 触发 CI 分发
- 检查工作流日志中的分发错误

**调试**：
```bash
# 检查 CI 工作流运行
gh run list --workflow=agent-ci.yml

# 检查 PR 路由日志
gh run list --workflow=agent-pr-router.yml
gh run view <run-id> --log
```

#### 3. 自动合并未工作 (L1)

**症状**：
- L1 PR CI 为绿色但不合并
- PR 降级为 L2

**解决方案**：
- 在仓库设置中启用自动合并
- 检查分支保护规则允许 bot 合并
- 验证 `AGENT_GH_TOKEN` 拥有合并权限
- 审查合并策略日志

**调试**：
```bash
# 检查合并策略日志
gh run list --workflow=agent-merge-policy.yml
gh run view <run-id> --log
```

#### 4. 状态不一致

**症状**：
- 计划显示任务为 `in-progress` 但 PR 已合并
- 调度器未分配下一个任务

**解决方案**：
- 等待协调 (每 6 小时运行一次)
- 手动触发协调：
  ```bash
  gh workflow run agent-reconcile.yml
  ```
- 检查协调日志

**调试**：
```bash
# 手动触发协调
gh workflow run agent-reconcile.yml

# 检查协调日志
gh run list --workflow=agent-reconcile.yml
gh run view <run-id> --log
```

#### 5. 任务卡在 Pending

**症状**：
- 任务子 Issue 已创建但从未分配给 Copilot
- 调度器未运行

**解决方案**：
- 检查父 Issue 是否已暂停 (`agent:paused` 标签)
- 验证依赖已满足
- 检查是否有另一个任务正在进行
- 手动触发调度器：
  ```bash
  gh workflow run agent-task-dispatcher.yml -f parent_issue=<issue-number>
  ```

**调试**：
```bash
# 检查调度器日志
gh run list --workflow=agent-task-dispatcher.yml
gh run view <run-id> --log

# 检查父 Issue 状态
gh issue view <issue-number>
```

### 获取帮助

1. **检查工作流日志**
   ```bash
   gh run list
   gh run view <run-id> --log
   ```

2. **审查状态评论**
   - 检查父 Issue 的状态 JSON 评论
   - 验证版本号是否增加

3. **验证配置**
   ```bash
   cat .github/agent/config.yml
   ```

4. **检查标签**
   ```bash
   gh label list | grep agent
   ```

5. **查看文档**
   - 参阅 `docs/agent/CONFIG.md` 获取配置详情
   - 检查 `.sisyphus/notepads/github-autonomous-agent/` 获取实施说明

## 🔐 安全性

### 安全特性

1. **受信任的操作者门控**
   - 仅 OWNER/MEMBER/COLLABORATOR 可以提交需求
   - 所有命令均针对作者关联进行验证
   - 外部用户无法触发工作流

2. **敏感路径保护**
   - 工作流、配置和密钥始终需要 L3 审查
   - 可配置的敏感模式
   - 无法被 L1/L2 绕过

3. **最小权限**
   - CI 以只读访问权限运行
   - CI 不暴露任何 Secrets
   - 每个工作流拥有最小所需权限

4. **状态可审计性**
   - Issue 评论中跟踪所有状态更改
   - 版本锁定防止竞争条件
   - 完整的审计跟踪

5. **基于标记的绑定**
   - PR 通过正文标记绑定到任务
   - 防止基于标题的欺骗
   - 验证父 Issue 和任务 ID

### 安全最佳实践

1. **令牌管理**
   - 使用细粒度 PAT (而非经典 PAT)
   - 将令牌范围限制为单个仓库
   - 定期轮换令牌
   - 永远不要将令牌提交到仓库

2. **分支保护**
   - 在主分支上启用分支保护
   - 对敏感更改要求 PR 审查
   - 启用状态检查
   - 限制谁可以推送

3. **工作流安全**
   - 仔细审查所有工作流更改
   - 永远不要通过 L1/L2 任务修改工作流
   - 对 CI 使用 `pull_request` 而非 `pull_request_target`
   - 验证所有输入

4. **Copilot 输出审查**
   - 始终审查 Spec 和 Plan PR
   - 验证任务拆分是否合理
   - 检查生成代码中的安全问题
   - 在合并前彻底测试

## 📄 许可证

MIT License - 详情请见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎贡献！请：

1. Fork 仓库
2. 创建功能分支
3. 提交您的更改
4. 提交 Pull Request

对于重大更改，请先打开一个 Issue 讨论您想要更改的内容。

## 📚 额外资源

- [配置指南](docs/agent/CONFIG.md)
- [Spec 模板](docs/agent/SPEC_TEMPLATE.md)
- [Plan 模板](docs/agent/PLAN_TEMPLATE.md)
- [实施说明](.sisyphus/notepads/github-autonomous-agent/)

## 🙏 致谢

- GitHub Copilot 团队提供的 coding agent API
- GitHub Actions 团队提供的工作流基础设施
- 本项目的所有贡献者

---

**状态**：生产就绪 | **版本**：1.0.0 | **最后更新**：2025-02-02
