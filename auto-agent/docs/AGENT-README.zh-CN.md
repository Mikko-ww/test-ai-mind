# GitHub 自治代理系统

[English](AGENT-README.md) | 简体中文

一个 GitHub 原生的自治代理，使用 GitHub Copilot 自动化 Issue → Spec → Plan → Implementation（问题 → 规格 → 计划 → 实现）的工作流。

## 🎯 这是什么？

这是一个 **GitHub 自治代理系统** - 一个使用 GitHub Copilot 自动处理从需求到实现的开发任务的自动化框架。它通过结构化的工作流将 GitHub Issues 转换为可工作的代码。

## 🚀 快速开始

### 用户：安装 CLI 工具

使用此系统最简单的方法是通过 CLI 工具：

```bash
# 导航到您的仓库
cd /path/to/your/repo

# 初始化 GitHub Agent（一条命令！）
npx github-agent-cli init

# 设置 GitHub 仓库（标签、权限）
github-agent setup --token YOUR_GITHUB_TOKEN

# 准备就绪！
```

详细使用方法请参阅 [CLI 文档](cli/README.zh-CN.md)。

### 开发者：理解系统

此仓库包含：
- **`cli/`** - 用于简易安装的命令行工具
- **`.github/`** - GitHub Actions 工作流和脚本
- **`agent/`** - 核心代理逻辑和状态管理
- **`docs/`** - 文档和模板

## 📖 目录

- [特性](#-特性)
- [架构](#%EF%B8%8F-架构)
- [安装](#-安装)
- [配置](#%EF%B8%8F-配置)
- [使用工作流](#-使用工作流)
- [ChatOps 命令](#-chatops-命令)
- [合并策略](#-合并策略)
- [故障排除](#-故障排除)
- [安全性](#-安全性)
- [贡献](#-贡献)
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
   - **L2 (中风险)**：需要命令批准 (\`/approve-task\`)
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

\`\`\`
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
│                  任务创建与执行                                  │
│  • 为每个任务创建子 Issue                                        │
│  • 串行分配任务给 Co                                 │
│  • 生成实现 PR                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│          CI 验证与合并策略评估                                   │
│  • 运行自动化测试                                                │
│  • 评估风险等级 (L1/L2/L3)                                       │
│  • 自动合并或等待批准                                            │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    所有任务完成                                  │
│  • 父 Issue 标记为完成                                           │
│  • 发送通知                                                      │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

### 目录结构

\`\`\`
.
├── cli/                                # 用于简易安装的 CLI 工具
│   ├── bin/cli.js                      # 可执行入口点
│   ├── src/                            # CLI 源代码
│   │   ├── commands/                   # 命令实现
│   │   ├── utils/                      # 实用模块
│   │   └── templates/                  # 模板文件
│   └── package.json
│
├── .github/
│   ├── agent/
│   │   └── config.yml                  # 主配置
│   ├── workflows/
│   │   ├── agent-bootstrap.yml         # 标签初始化
│   │   ├── agent-intake.yml            # Issue 接收
│   │   ├── agent-pr-router.yml         # PR 路由
│   │   ├── agent-task-creator.yml      # 任务创建
│   │   ├── agent-task-dispatcher.yml   # 任务调度
│   │   ├── agent-ci.yml                # CI 验证
│   │   ├── agent-merge-policy.yml      # 合并策略
│   │   ├── agent-commands.yml          # ChatOps 命令
│   │   └── agent-reconcile.yml         # 协调/修复
│   ├── scripts/                        # 外部工作流脚本
│   │   ├── lib/                        # 共享库
│   │   │   ├── github-client.js        # GitHub API 封装
│   │   │   ├── config-loader.js        # 配置加载器
│   │   │   ├── state-manager.js        # 状态管理
│   │   │   └── utils.js                # 实用函数
│   │   └── *.js                        # 工作流脚本
│   └── ISSUE_TEMPLATE/
│       └── agent-request.yml           # 需求模板
│
├── auto-agent/docs/
│   ├── CONFIG.md                       # 配置指南
│   ├── config.schema.json              # 配置验证
│   ├── SPEC_TEMPLATE.md                # Spec 模板 (中文)
│   ├── PLAN_TEMPLATE.md                # Plan 模板 (中文)
│   ├── plan.schema.json                # Plan 验证
│   ├── plan.example.yaml               # 计划示例
│   ├── AGENT-README.md                 # Agent 使用文档 (英文)
│   └── AGENT-README.zh-CN.md           # Agent 使用文档 (中文)
│
├── agent/
│   ├── package.json                    # Node.js 依赖
│   ├── tsconfig.json                   # TypeScript 配置
│   └── src/
│       └── state.ts                    # 状态管理
│
└── plans/                              # 生成的计划 (YAML + MD)
\`\`\`

## 📦 安装

### 方法 1：使用 CLI 工具（推荐）

在您的仓库中安装 GitHub Agent 最简单的方法：

\`\`\`bash
# 导航到您的仓库
cd /path/to/your/repo

# 初始化 GitHub Agent
npx github-agent-cli init

# 设置 GitHub 仓库
github-agent setup --token YOUR_GITHUB_TOKEN

# 验证安装
github-agent validate
\`\`\`

更多选项请参阅 [CLI 文档](cli/README.zh-CN.md)。

### 方法 2：手动安装

如果您更喜欢手动安装：

#### 前提条件

1. **GitHub Copilot**
   - 为您的仓库启用 GitHub Copilot
   - 确保 Copilot coding agent 可用

2. **仓库设置**
   - 启用 Actions 的读/写权限
   - 启用自动合并（可选，用于 L1 自动合并）
   - 配置分支保护规则（可选）

3. **细粒度个人访问令牌 (PAT)**
   - 创建一个具有以下权限的细粒度 PAT：
     - **Metadata**: Read (必须)
     - **Issues**: Read and write
     - **Pull requests**: Read and write
     - **Contents**: Read and write
     - **Actions**: Read and write
     - **Checks**: Read and write

#### 安装步骤

1. **克隆或复制文件**

\`\`\`bash
# 克隆此仓库
git clone <this-repo-url>

# 复制到您的目标仓库
cp -r .github /path/to/your/repo/
cp -r docs /path/to/your/repo/
cp -r agent /path/to/your/repo/
\`\`\`

2. **配置 Secrets**

将以下 Secret 添加到您的仓库：

\`\`\`bash
# 导航至：Settings → Secrets and variables → Actions → New repository secret

# 必需：
AGENT_GH_TOKEN=<your-fine-grained-pat>

# 可选（用于 webhook 通知）：
AGENT_WEBHOOK_URL=<your-webhook-endpoint>
AGENT_WEBHOOK_SECRET=<your-webhook-secret>
\`\`\`

3. **安装依赖**

\`\`\`bash
cd agent
npm install
\`\`\`

4. **初始化标签**

运行引导工作流以创建所有必需的标签：

\`\`\`bash
# 使用 GitHub CLI
gh workflow run agent-bootstrap.yml

# 或者通过 GitHub UI 手动触发：
# Actions → agent-bootstrap → Run workflow
\`\`\`

5. **验证安装**

检查所有标签是否已创建：

\`\`\`bash
gh label list | grep agent
\`\`\`

## ⚙️ 配置

### 基本配置

编辑 \`.github/agent/config.yml\` 以自定义代理行为：

\`\`\`yaml
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
\`\`\`

### 高级配置

查看 [`auto-agent/docs/CONFIG.md`](auto-agent/docs/CONFIG.md) 获取详细的配置选项。

## 🔄 使用工作流

### 步骤 1：提交需求

1. 导航到仓库的 **Issues** 标签页
2. 点击 **New Issue** 并选择 **Agent Request** 模板
3. 填写详细需求：
   - **背景**：为什么需要这个？
   - **范围**：包含什么，不包含什么？
   - **验收标准**：我们如何知道它完成了？
4. 点击 **Submit New Issue**

> **结果**：代理将拾取该 Issue，标记为 \`agent:spec-in-progress\`，并指派 Copilot 编写规格说明书。

### 步骤 2：审查规格

1. 等待约 **20 分钟**。Copilot 将创建一个标题为 \`[Spec] Issue #<id>...\` 的 Pull Request (PR)
2. 审查生成的 **中文规格说明书** (\`docs/specs/issue-<id>.md\`)
3. **操作**：
   - 如果正确：**合并 (Merge)** 该 PR
   - 如果需要修改：在 PR 中评论或直接编辑文件，然后合并

> **结果**：合并 Spec PR 将触发计划生成阶段 (\`agent:plan-in-progress\`)。

### 步骤 3：审查计划

1. 等待约 **20 分钟**。Copilot 将创建一个标题为 \`[Plan] Issue #<id>...\` 的 PR
2. 审查 **计划** 文件 (\`plans/issue-<id>.yaml\` 和 \`.md\`)
   - 检查任务拆分
   - 检查风险等级 (L1/L2/L3)
3. **操作**：如果计划看起来不错，请 **合并 (Merge)** 该 PR

> **结果**：合并 Plan PR 将触发为每个任务创建子 Issue 并开始执行。

### 步骤 4：监控执行

代理将 **串行**（一个接一个）执行任务。

1. 前往 **父 Issue**。您将看到包含当前状态 (JSON) 的评论
2. 查找代理创建的子 Issue（例如 \`Task 1: ...\`）
3. 代理将在这些子 Issue 上操作以生成实现代码

### 步骤 5：审查与合并任务

Copilot 将为每个任务开启一个 PR。合并流程取决于 **风险等级**：

#### 🟢 L1: 低风险 (自动合并)
- **标准**：仅触及文档、测试或白名单文件
- **操作**：无需操作。如果 CI 通过，将自动合并

#### 🟡 L2: 中风险 (命令批准)
- **标准**：触及逻辑代码但无敏感文件
- **操作**：
  1. 等待 CI 检查通过（绿色）
  2. 在 PR 中评论 **/approve-task**
  3. 代理将合并该 PR

#### 🔴 L3: 高风险 (人工审查)
- **标准**：触及工作流、密钥或大量更改（>300 个文件）
- **操作**：需要通过 GitHub UI 进行完整的人工审查和手动批准

## 💬 ChatOps 命令

在 Issue 或 PR 的评论中使用这些命令。

| 命令 | 上下文 | 描述 |
| :--- | :--- | :--- |
| \`/approve-task\` | **仅 PR** | 批准并合并 L2 任务（需要 CI 通过） |
| \`/pause\` | **Issue/PR** | 暂停自动化调度器 |
| \`/resume\` | **Issue/PR** | 暂停后恢复调度器 |
| \`/abort\` | **Issue/PR** | 永久停止整个工作流 |
| \`/help\` | **Issue/PR** | 显示帮助信息 |

### 命令详情

#### \`/approve-task\`

**目的**：批准并合并 L2 任务 PR

**要求**：
- 必须在 PR 上使用（不是 Issue）
- PR 必须有 \`agent:l2\` 标签
- CI 检查必须已通过
- 用户必须是 OWNER/MEMBER/COLLABORATOR

**示例**：
\`\`\`
更改看起来不错。CI 是绿色的。

/approve-task
\`\`\`

#### \`/pause\`

**目的**：暂停任务分发

**效果**：
- 向父 Issue 添加 \`agent:paused\` 标签
- 停止调度器分配新任务
- 当前进行中的任务继续

#### \`/resume\`

**目的**：暂停后恢复任务分发

**效果**：
- 移除 \`agent:paused\` 标签
- 触发调度器继续
- 分配下一个待处理任务

#### \`/abort\`

**目的**：中止整个管道

**效果**：
- 添加 \`agent:blocked\` 标签
- 停止所有任务分发
- 保留审计跟踪

## 🔒 合并策略

### L1: 低风险 (自动合并)

**标准**：
- 所有更改的文件匹配白名单模式
- CI 检查通过
- 未触及敏感文件

**白名单模式** (默认)：
- \`docs/**\`
- \`*.md\`
- \`tests/**\`
- \`**/*.test.js\`
- \`**/*.test.ts\`
- \`**/*.spec.js\`
- \`**/*.spec.ts\`
- \`plans/**\`

**行为**：
- CI 绿色时自动合并
- 无需人工批准
- 如果自动合并失败，降级为 L2

### L2: 中风险 (命令批准)

**标准**：
- 包含白名单以外的文件
- 未触及敏感文件
- CI 检查通过

**行为**：
- 等待 \`/approve-task\` 命令
- 需要 OWNER/MEMBER/COLLABORATOR
- 收到命令后合并

### L3: 高风险 (全面审查)

**标准**：
- 包含敏感文件
- 或更改超过 300 个文件
- 需要完整的 PR 审查

**敏感模式** (默认)：
- \`.github/workflows/**\`
- \`.github/actions/**\`
- \`**/*.yml\`
- \`**/*.yaml\`
- \`package.json\`
- \`package-lock.json\`
- \`Dockerfile\`
- \`.env*\`
- \`**/*secret*\`
- \`**/*credential*\`
- \`**/*token*\`

**行为**：
- 需要完整的 PR 审查批准
- 遵循分支保护规则
- 可能需要 CODEOWNERS 批准

## 🔧 故障排除

### 常见问题

#### 1. Copilot 不生成 PR

**症状**：
- 20多分钟后没有出现 Spec/Plan/Task PR
- 父 Issue 卡在 \`spec-in-progress\` 或 \`plan-in-progress\`

**解决方案**：
- 验证仓库已启用 GitHub Copilot
- 检查 \`AGENT_GH_TOKEN\` 是否有正确权限
- 验证令牌可以将 Issue 分配给 \`copilot-swe-agent[bot]\`
- 检查工作流日志中的 API 错误

**调试**：
\`\`\`bash
# 检查 Copilot 是否已分配
gh issue view <issue-number>

# 检查工作流运行
gh run list --workflow=agent-intake.yml
gh run view <run-id> --log
\`\`\`

#### 2. CI 未运行

**症状**：
- Task PR 已创建但没有出现 CI check-run
- PR 卡住，没有 \`agent/ci\` 检查

**解决方案**：
- 验证 Actions 权限设置为读/写
- 检查 \`agent-ci.yml\` 工作流是否存在
- 验证 \`agent-pr-router.yml\` 触发 CI 分发
- 检查工作流日志中的分发错误

#### 3. 自动合并未工作 (L1)

**症状**：
- L1 PR CI 为绿色但不合并
- PR 降级为 L2

**解决方案**：
- 在仓库设置中启用自动合并
- 检查分支保护规则允许 bot 合并
- 验证 \`AGENT_GH_TOKEN\` 拥有合并权限
- 审查合并策略日志

#### 4. 状态不一致

**症状**：
- 计划显示任务为 \`in-progress\` 但 PR 已合并
- 调度器未分配下一个任务

**解决方案**：
- 等待协调（每 6 小时运行一次）
- 手动触发协调：
  \`\`\`bash
  gh workflow run agent-reconcile.yml
  \`\`\`

#### 5. 任务卡在 Pending

**症状**：
- 任务子 Issue 已创建但从未分配给 Copilot
- 调度器未运行

**解决方案**：
- 检查父 Issue 是否已暂停（\`agent:paused\` 标签）
- 验证依赖已满足
- 检查是否有另一个任务正在进行
- 手动触发调度器：
  \`\`\`bash
  gh workflow run agent-task-dispatcher.yml -f parent_issue=<issue-number>
  \`\`\`

### 获取帮助

1. **检查工作流日志**
   \`\`\`bash
   gh run list
   gh run view <run-id> --log
   \`\`\`

2. **审查状态评论**
   - 检查父 Issue 的状态 JSON 评论
   - 验证版本号是否增加

3. **验证配置**
   \`\`\`bash
   cat .github/agent/config.yml
   \`\`\`

4. **验证设置**
   \`\`\`bash
   github-agent validate --token YOUR_TOKEN
   \`\`\`

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
   - 使用细粒度 PAT（而非经典 PAT）
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
   - 对 CI 使用 \`pull_request\` 而非 \`pull_request_target\`
   - 验证所有输入

4. **Copilot 输出审查**
   - 始终审查 Spec 和 Plan PR
   - 验证任务拆分是否合理
   - 检查生成代码中的安全问题
   - 在合并前彻底测试

## 🤝 贡献

欢迎贡献！请：

1. Fork 仓库
2. 创建功能分支
3. 提交您的更改
4. 提交 Pull Request

对于重大更改，请先打开一个 Issue 讨论您想要更改的内容。

## 📄 许可证

MIT License - 详情请见 [LICENSE](LICENSE) 文件

## 📚 额外资源

- [CLI 文档](cli/README.zh-CN.md)
- [配置指南](auto-agent/docs/CONFIG.md)
- [Spec 模板](auto-agent/docs/SPEC_TEMPLATE.md)
- [Plan 模板](auto-agent/docs/PLAN_TEMPLATE.md)

## 🙏 致谢

- GitHub Copilot 团队提供的 coding agent API
- GitHub Actions 团队提供的工作流基础设施
- 本项目的所有贡献者

---

**状态**：生产就绪 | **版本**：1.0.0 | **最后更新**：2025-02-03
