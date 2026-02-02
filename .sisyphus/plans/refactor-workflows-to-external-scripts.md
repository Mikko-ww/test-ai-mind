# 重构计划：将 Workflow 内联脚本提取为外部 JS 文件

## 目标

将 `.github/workflows/` 中所有内联的 JavaScript 脚本提取为独立的外部脚本文件，提高代码可维护性、可测试性和可读性。

## 现状分析

### 内联脚本统计

共有 **9 个 workflow 文件**，包含 **20 个内联脚本**：

| Workflow 文件 | 脚本数量 | 脚本功能 |
|--------------|---------|---------|
| `agent-task-dispatcher.yml` | 1 | 任务分发逻辑 |
| `agent-task-creator.yml` | 2 | 创建任务 issue、创建状态更新 PR |
| `agent-pr-router.yml` | 4 | PR 类型识别、Spec PR 处理、Plan PR 处理、触发 CI |
| `agent-merge-policy.yml` | 2 | 评估合并策略、L1 自动合并 |
| `agent-intake.yml` | 3 | 初始化状态、添加标签、分配给 Copilot |
| `agent-commands.yml` | 3 | 解析命令、处理 approve-task、处理 pause/resume/abort |
| `agent-ci.yml` | 3 | 验证 PR 参数、创建 check run、更新 check run |
| `agent-reconcile.yml` | 1 | 状态协调 |
| `agent-bootstrap.yml` | 1 | 初始化标签 |

### 当前问题

1. **YAML 转义问题** - Markdown 语法（`**`、`#`）被误认为 YAML 别名
2. **代码难以维护** - 大量 JS 代码混在 YAML 中，没有语法高亮
3. **无法测试** - 内联脚本无法进行单元测试
4. **代码重复** - 相似逻辑在多个 workflow 中重复
5. **IDE 支持差** - 没有自动补全、类型检查

## 目标架构

### 目录结构

```
.github/
├── scripts/
│   ├── lib/
│   │   ├── github-client.js      # GitHub API 封装
│   │   ├── config-loader.js      # 配置加载
│   │   ├── state-manager.js      # 状态管理
│   │   └── utils.js              # 通用工具函数
│   ├── dispatch-task.js          # 任务分发
│   ├── create-tasks.js           # 创建任务 issues
│   ├── create-status-pr.js       # 创建状态更新 PR
│   ├── identify-pr-type.js       # 识别 PR 类型
│   ├── handle-spec-merge.js      # 处理 Spec PR 合并
│   ├── handle-plan-merge.js      # 处理 Plan PR 合并
│   ├── trigger-ci.js             # 触发 CI
│   ├── evaluate-merge-p.js  # 评估合并策略
│   ├── auto-merge-l1.js          # L1 自动合并
│   ├── initialize-state.js       # 初始化状态
│   ├── add-labels.js             # 添加标签
│   ├── assign-to-copilot.js      # 分配给 Copilot
│   ├── parse-command.js          # 解析命令
│   ├── handle-approve-task.js    # 处理 approve-task
│   ├── handle-pause-resume.js    # 处理 pause/resume/abort
│   ├── validate-pr.js            # 验证 PR 参数
│   ├── create-check-run.js       # 创建 check run
│   ├── update-check-run.js       # 更新 check run
│   ├── reconcile-state.js        # 状态协调
│   └── bootstrap-labels.js       # 初始化标签
├── workflows/
│   └── (所有 workflow 文件)
└── agent/
    └── config.yml
```

### 共享库设计

#### `lib/github-client.js`
```javascript
// 封装 Octokit，提供统一的 GitHub API 访问
class GitHubClient {
  constructor(token, owner, repo);
  async getIssue(issueNumber);
  async createComment(issueNumber, body);
  async addLabels(issueNumber, labels);
  async removeLabel(issueNumber, label);
  // ... 更多方法
}
```

#### `lib/config-loader.js`
```javascript
// 加载和解析配置文件
function loadConfig();
function getConfigValue(path);
```

#### `lib/state-manager.js`
```javascript
// 状态管理
async function getLatestState(issueNumber);
async function updateState(issueNumber, newState);
async function createStateComment(issueNumber, state);
```

#### `lib/utils.js`
```javascript
// 通用工具函数
function buildCustomInstructions(template, data);
function parseMarkers(prBody);
function formatComment(template, data);
```

## 实施步骤

### 阶段 1：创建共享库（优先级：高）

**任务 1.1：创建 GitHub Client 封装**
- 文件：`.github/scripts/lib/github-client.js`
- 功能：封装所有 GitHub API 调用
- 依赖：`@octokit/rest`

**任务 1.2：创建配置加载器**
- 文件：`.github/scripts/lib/config-loader.js`
- 功能：加载 `.github/agent/config.yml`
- 依赖：`js-yaml`

**任务 1.3：创建状态管理器**
- 文件：`.github/scripts/lib/state-manager.js`
- 功能：读取、更新、创建状态评论
- 依赖：`github-client.js`

**任务 1.4：创建工具函数库**
- 文件：`.github/scripts/lib/utils.js`
- 功能：字符串处理、模板渲染等

### 阶段 2：提取核心脚本（优先级：高）

**任务 2.1：提取任务分发脚本**
- 源文件：`agent-task-dispatcher.yml` (line 42-246)
- 目标文件：`.github/scripts/dispatch-task.js`
- 环境变量：
  - `AGENT_GH_TOKEN` - GitHub token
  - `PARENT_ISSUE` - 父 issue 编号
  - `GITHUB_REPOSITORY` - 仓库名称
- 输出：退出码（0=成功，1=失败）

**任务 2.2：提取任务创建脚本**
- 源文件：`agent-task-creator.yml` (line 38-171)
- 目标文件：`.github/scripts/create-tasks.js`
- 环境变量：
  - `AGENT_GH_TOKEN`
  - `PARENT_ISSUE`
  - `GITHUB_REPOSITORY`

**任务 2.3：提取状态更新 PR 脚本**
- 源文件：`agent-task-creator.yml` (line 179-299)
- 目标文件：`.github/scripts/create-status-pr.js`
- 环境变量：同上

### 阶段 3：提取 PR 路由脚本（优先级：高）

**任务 3.1：提取 PR 类型识别**
- 源文件：`agent-pr-router.yml` (line 24-59)
- 目标文件：`.github/scripts/identify-pr-type.js`
- 输入：PR 编号
- 输出：JSON `{prType, parentIssue, taskId}`

**任务 3.2：提取 Spec PR 处理**
- 源文件：`agent-pr-router.yml` (line 67-160)
- 目标文件：`.github/scripts/handle-spec-merge.js`

**任务 3.3：提取 Plan PR 处理**
- 源文件：`agent-pr-router.yml` (line 169-207)
- 目标文件：`.github/scripts/handle-plan-merge.js`

**任务 3.4：提取 CI 触发**
- 源文件：`agent-pr-router.yml` (line 216-250)
- 目标文件：`.github/scripts/trigger-ci.js`

### 阶段 4：提取合并策略脚本（优先级：高）

**任务 4.1：提取合并策略评估**
- 源文件：`agent-merge-policy.yml` (line 44-192)
- 目标文件：`.github/scripts/evaluate-merge-policy.js`
- 输入：PR 编号、父 issue、任务 ID
- 输出：`{finalLevel, canAutoMerge}`

**任务 4.2：提取 L1 自动合并**
- 源文件：`agent-merge-policy.yml` (line 201-240)
- 目标文件：`.github/scripts/auto-merge-l1.js`

### 阶段 5：提取 Intake 脚本（优先级：中）

**任务 5.1：提取状态初始化**
- 源文件：`agent-intake.yml` (line 45-80)
- 目标文件：`.github/scripts/initialize-state.js`

**任务 5.2：提取标签添加**
- 源文件：`agent-intake.yml` (line 88-98)
- 目标文件：`.github/scripts/add-labels.js`

**任务 5.3：提取 Copilot 分配**
- 源文件：`agent-intake.yml` (line 106-187)
- 目标文件：`.github/scripts/assign-to-copilot.js`

### 阶段 6：提取命令处理脚本（优先级：中）

**任务 6.1：提取命令解析**
- 源文件：`agent-commands.yml` (line 39-51)
- 目标文件：`.github/scripts/parse-command.js`

**任务 6.2：提取 approve-task 处理**
- 源文件：`agent-commands.yml` (line 60-133)
- 目标文件：`.github/scripts/handle-approve-task.js`

**任务 6.3：提取 pause/resume/abort 处理**
- 源文件：`agent-commands.yml` (line 142-202)
- 目标文件：`.github/scripts/handle-pause-resume.js`

### 阶段 7：提取 CI 脚本（优先级：中）

**任务 7.1：提取 PR 验证**
- 源文件：`agent-ci.yml` (line 32-54)
- 目标文件：`.github/scripts/validate-pr.js`

**任务 7.2：提取 Check Run 创建**
- 源文件：`agent-ci.yml` (line 60-75)
- 目标文件：`.github/scripts/create-check-run.js`

**任务 7.3：提取 Check Run 更新**
- 源文件：`agent-ci.yml` (line 111-163)
- 目标文件：`.github/scripts/update-check-run.js`

### 阶段 8：提取其他脚本（优先级：低）

**任务 8.1：提取状态协调**
- 源文件：`agent-reconcile.yml` (line 34-86)
- 目标文件：`.github/scripts/reconcile-state.js`

**任务 8.2：提取标签初始化**
- 源文件：`agent-bootstrap.yml` (line 27-159)
- 目标文件：`.github/scripts/bootstrap-labels.js`

### 阶段 9：更新 Workflow 文件（优先级：高）

**任务 9.1：更新 agent-task-dispatcher.yml**
```yaml
- name: Dispatch next task
  run: node .github/scripts/dispatch-task.js
  env:
    AGENT_GH_TOKEN: ${{ secrets.AGENT_GH_TOKEN }}
    PARENT_ISSUE: ${{ inputs.parent_issue }}
    GITHUB_REPOSITORY: ${{ github.repository }}
```

**任务 9.2-9.9：更新其他 workflow 文件**
- 按照相同模式更新所有 workflow 文件
- 移除 `uses: actions/github-script@v7`
- 改为 `run: node .github/scripts/xxx.js`

### 阶段 10：测试验证（优先级：高）

**任务 10.1：YAML 语法验证**
```bash
node -e "const yaml = require('js-yaml'); const fs = require('fs'); 
const files = fs.readdirSync('.github/workflows').filter(f => f.endsWith('.yml')); 
files.forEach(f => yaml.load(fs.readFileSync('.github/workflows/' + f, 'utf8')));"
```

**任务 10.2：脚本语法检查**
```bash
npm run lint .github/scripts/**/*.js
```

**任务 10.3：创建单元测试**
- 为共享库创建测试
- 测试覆盖率 > 80%

**任务 10.4：集成测试**
- 手动触发 workflow
- 验证所有功能正常

## 依赖管理

### package.json 更新

需要在项目根目录添加/更新 `package.json`：

```json
{
  "name": "github-autonomous-agent",
  "version": "1.0.0",
  "scripts": {
    "lint": "eslint",
    "test": "jest"
  },
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@octokit/rest": "^19.0.0",
    "js-yaml": "^4.1.0",
    "minimatch": "^9.0.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "jest": "^29.0.0"
  }
}
```

## 风险与缓解

### 风险 1：脚本执行权限
- **风险**：外部脚本可能没有执行权限
- **缓解**：在脚本开头添加 `#!/usr/bin/env node`，并设置 `chmod +x`

### 风险 2：环境变量传递
- **风险**：环境变量可能丢失或传递错误
- **缓解**：在每个 workflow step 中明确声明所有需要的环境变量

### 风险 3：错误处理
- **风险**：脚本错误可能导致 workflow 失败但没有清晰的错误信息
- **缓解**：使用 `@actions/core` 的 `setFailed()` 方法，确保错误信息清晰

### 风险 4：向后兼容性
- **风险**：重构可能破坏现有功能
- **缓解**：
  1. 先创建新脚本，保留旧的内联代码
  2. 逐个 workflow 迁移并测试
  3. 确认无问题后再删除内联代码

## 验收标准

1. ✅ 所有内联脚本已提取为独立 JS 文件
2. ✅ 所有 workflow 文件 YAML 语法正确
3. ✅ 所有脚本通过 ESLint 检查
4. ✅ 共享库有单元测试，覆盖率 > 80%
5. ✅ 手动触发所有 workflow，功能正常
6. ✅ 代码可读性提升，有清晰的注释和文档
7. ✅ 没有 YAML 转义问题（`**`、`#` 等）

## 时间估算

- 阶段 1（共享库）：4 小时
- 阶段 2-4（核心脚本）：8 小时
- 阶段 5-8（其他脚本）：6 小时
- 阶段 9（更新 workflow）：3 小时
- 阶段 10（测试验证）：3 小时

**总计：约 24 小时**

## 执行建议

1. **分批执行**：不要一次性重构所有文件，按阶段逐步进行
2. **先测试后部署**：每完成一个阶段，立即测试验证
3. **保留备份**：在 git 中创建分支，保留原始版本
4. **文档同步**：更新 README.md 和相关文档

## 后续优化

重构完成后，可以进一步优化：

1. **TypeScript 迁移**：将 JS 脚本迁移到 TypeScript，增强类型安全
2. **性能优化**：缓存配置、并行执行独立任务
3. **监控告警**：添加日志和监控，及时发现问题
4. **CI/CD 集成**：在 PR 中自动运行脚本测试

---

**准备好开始执行了吗？使用 `/start-work` 命令启动 Sisyphus 执行此计划！**
