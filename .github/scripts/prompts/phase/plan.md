# Task: Generate Execution Plan (执行计划)

Create a detailed execution plan with task breakdown.

## Requirements:
1. Create YAML: `{{planYamlDir}}/issue-{{epicNumber}}.yaml`
2. Create Markdown: `{{planMdDir}}/issue-{{epicNumber}}.md`
3. Follow template: `auto-agent/docs/PLAN_TEMPLATE.md`
4. Include task breakdown with risk levels (`l1`/`l2`/`l3`)
5. Write in Chinese (中文)

## YAML Contract (STRICT):

- YAML keys MUST be machine keys in English.
- Do NOT use aliases such as `dependencies`, `acceptance_criteria`, `risk_level`.
- Do NOT use Chinese keys such as `依赖`, `验收标准`, `风险等级`.
- Required root field: `tasks`.
- Required task fields: `id`, `title`, `level`, `deps`, `acceptance`.
- Allowed task levels: `l1`, `l2`, `l3`.
- `deps` MUST be an array of task ids. Use `[]` when no dependency exists.
- Runtime fields (`status`, `issue`, `pr`) are managed by agent state and MUST NOT appear in plan YAML.

Minimum valid YAML example:

```yaml
tasks:
  - id: task-setup-env
    title: "初始化项目环境"
    level: l1
    deps: []
    acceptance: "项目结构创建完成并可安装依赖"
    notes: "可选"
```

Before commit and PR, you MUST run validation and fix all errors until it passes:

```bash
node .github/scripts/validate-plan.js --file {{planYamlDir}}/issue-{{epicNumber}}.yaml --strict --format copilot
```

If validation fails, do NOT commit. Fix YAML and rerun validation.

## PR Requirements:
1. Title: "[Plan] Epic #{{epicNumber}}: <description>"
2. Body must include:
   ```
   <!-- agent-markers:start -->
   Agent-Schema-Version: 2
   Agent-Parent-Issue: {{epicNumber}}
   Agent-PR-Type: plan
   Agent-Phase-Name: plan
   <!-- agent-markers:end -->
   ```
3. Target branch: {{baseBranch}}
