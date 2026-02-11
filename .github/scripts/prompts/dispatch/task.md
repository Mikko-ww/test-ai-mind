# Task: {{taskTitle}}

Parent Issue: #{{parentIssue}}
Task ID: {{taskId}}
Level: {{taskLevel}}

## Task Description

{{taskBody}}

## Acceptance Criteria

{{acceptance}}

## Implementation Guidelines

1. Follow the acceptance criteria exactly
2. Write tests for your changes
3. Ensure code passes lint and tests
4. Keep changes focused and atomic

## PR Requirements

1. PR title: "[{{taskId}}] {{taskTitle}}"
2. CRITICAL: PR body MUST include these markers:
   ```
   Agent-Parent-Issue: {{parentIssue}}
   Agent-Task-Id: {{taskId}}
   ```
3. Target branch: {{baseBranch}}
4. Link to task issue: #{{taskIssue}}

## Risk Level: {{taskLevelUpper}}

{{riskNotes}}
