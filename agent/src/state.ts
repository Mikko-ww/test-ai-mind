/**
 * State management for agent orchestration
 * Handles reading/writing state comments on parent issues
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';

export interface AgentState {
  state_id: string;
  version: number;
  parent_issue: number;
  plan_path: string | null;
  cursor_task_id: string | null;
  tasks: Record<string, TaskState>;
  paused: boolean;
  phase: string;
  created_at: string;
  updated_at: string;
}

export interface TaskState {
  status: 'pending' | 'in-progress' | 'in-review' | 'blocked' | 'done' | 'cancelled';
  level: 'l1' | 'l2' | 'l3';
  issue: number | null;
  pr: number | null;
  last_update: string;
}

const STATE_MARKER = '<!-- agent-state:json -->';
const MAX_RETRIES = 3;

export class StateManager {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async readState(issueNumber: number): Promise<AgentState | null> {
    const comments = await this.octokit.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      per_page: 100
    });

    const stateComments = comments.data
      .filter(c => c.body?.includes(STATE_MARKER))
      .map(c => {
        try {
          const jsonMatch = c.body?.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            const state = JSON.parse(jsonMatch[1]) as AgentState;
            return { commentId: c.id, state };
          }
        } catch (e) {
          core.warning(`Failed to parse state comment ${c.id}: ${e}`);
        }
        return null;
      })
      .filter((x): x is { commentId: number; state: AgentState } => x !== null);

    if (stateComments.length === 0) {
      return null;
    }

    stateComments.sort((a, b) => b.state.version - a.state.version);
    return stateComments[0].state;
  }

  async writeState(issueNumber: number, state: AgentState): Promise<void> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const currentState = await this.readState(issueNumber);
      
      if (currentState && currentState.version >= state.version) {
        state.version = currentState.version + 1;
      }

      state.updated_at = new Date().toISOString();

      const stateComment = `${STATE_MARKER}
\`\`\`json
${JSON.stringify(state, null, 2)}
\`\`\`

**Agent State Updated** (version ${state.version})

Phase: \`${state.phase}\`
${state.cursor_task_id ? `Current Task: \`${state.cursor_task_id}\`` : ''}
${state.paused ? '⏸️ **PAUSED**' : ''}

_This comment tracks execution state. Do not edit manually._`;

      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: stateComment
      });

      const verifyState = await this.readState(issueNumber);
      if (verifyState && verifyState.version === state.version) {
        core.info(`✓ State written successfully (version ${state.version})`);
        return;
      }

      core.warning(`State version mismatch on attempt ${attempt + 1}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }

    throw new Error('Failed to write state after maximum retries');
  }

  async initializeState(issueNumber: number): Promise<AgentState> {
    const initialState: AgentState = {
      state_id: `agent-state:${this.owner}/${this.repo}:${issueNumber}`,
      version: 1,
      parent_issue: issueNumber,
      plan_path: null,
      cursor_task_id: null,
      tasks: {},
      paused: false,
      phase: 'spec-in-progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.writeState(issueNumber, initialState);
    return initialState;
  }
}
