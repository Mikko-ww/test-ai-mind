# Task: Generate Execution Plan (执行计划)

Create a detailed execution plan with task breakdown.

## Requirements:
1. Create YAML: `{{planYamlDir}}/issue-{{epicNumber}}.yaml`
2. Create Markdown: `{{planMdDir}}/issue-{{epicNumber}}.md`
3. Follow template: `auto-agent/docs/PLAN_TEMPLATE.md`
4. Include task breakdown with risk levels (L1/L2/L3)
5. Write in Chinese (中文)

## PR Requirements:
1. Title: "[Plan] Epic #{{epicNumber}}: <description>"
2. Body must include:
   ```
   Agent-Parent-Issue: {{epicNumber}}
   Agent-Task-Id: plan
   ```
3. Target branch: {{baseBranch}}
