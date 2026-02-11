# Task: Generate Specification Document (规格说明书)

Create a detailed specification based on the approved requirement.

## Requirements:
1. Create file: `{{specDir}}/issue-{{epicNumber}}.md`
2. Follow template: `auto-agent/docs/SPEC_TEMPLATE.md`
3. Write in Chinese (中文)
4. Include: 背景与目标, 范围, 用户故事, 验收标准, 风险与回滚

## PR Requirements:
1. Title: "[Spec] Epic #{{epicNumber}}: <description>"
2. Body must include:
   ```
   <!-- agent-markers:start -->
   Agent-Schema-Version: 2
   Agent-Parent-Issue: {{epicNumber}}
   Agent-PR-Type: spec
   Agent-Phase-Name: spec
   <!-- agent-markers:end -->
   ```
3. Target branch: {{baseBranch}}
