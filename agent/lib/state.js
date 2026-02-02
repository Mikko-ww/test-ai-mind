class StateManager {
  constructor(githubClient, config) {
    this.github = githubClient;
    this.config = config;
    this.marker = config.state.marker;
    this.maxRetries = config.state.max_version_retries;
  }

  async readState(issueNumber) {
    const comments = await this.github.listComments(issueNumber);
    
    const stateComments = comments.filter(c => c.body.includes(this.marker));
    
    if (stateComments.length === 0) {
      return null;
    }

    let latestState = null;
    let latestVersion = -1;

    for (const comment of stateComments) {
      try {
        const jsonMatch = comment.body.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          const state = JSON.parse(jsonMatch[1]);
          if (state.version > latestVersion) {
            latestVersion = state.version;
            latestState = { ...state, _commentId: comment.id };
          }
        }
      } catch (e) {
        console.error('Failed to parse state comment:', e);
      }
    }

    return latestState;
  }

  async writeState(issueNumber, state, retryCount = 0) {
    const currentState = await this.readState(issueNumber);
    
    if (currentState && currentState.version >= state.version) {
      if (retryCount < this.maxRetries) {
        state.version = currentState.version + 1;
        return await this.writeState(issueNumber, state, retryCount + 1);
      }
      throw new Error('Version conflict: state has been updated by another process');
    }

    state.updated_at = new Date().toISOString();

    const body = `${this.marker}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n---\n\n**Agent State**: ${state.status || 'active'}\n**Version**: ${state.version}\n**Last Updated**: ${state.updated_at}`;

    if (currentState && currentState._commentId) {
      await this.github.updateComment(currentState._commentId, body);
    } else {
      await this.github.createComment(issueNumber, body);
    }

    const verifyState = await this.readState(issueNumber);
    if (verifyState.version !== state.version) {
      if (retryCount < this.maxRetries) {
        return await this.writeState(issueNumber, state, retryCount + 1);
      }
      throw new Error('State verification failed after write');
    }

    return state;
  }

  async initializeState(issueNumber) {
    const state = {
      state_id: `agent-state:${this.github.owner}/${this.github.repo}:${issueNumber}`,
      version: 1,
      parent_issue: issueNumber,
      plan_path: null,
      cursor_task_id: null,
      tasks: {},
      paused: false,
      status: 'spec-in-progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.writeState(issueNumber, state);
  }

  async updateTaskStatus(issueNumber, taskId, status, updates = {}) {
    const state = await this.readState(issueNumber);
    if (!state) {
      throw new Error('State not found');
    }

    if (!state.tasks[taskId]) {
      state.tasks[taskId] = { id: taskId };
    }

    state.tasks[taskId] = {
      ...state.tasks[taskId],
      status,
      ...updates,
      last_update: new Date().toISOString()
    };

    state.version += 1;
    return await this.writeState(issueNumber, state);
  }

  async moveCursor(issueNumber, taskId) {
    const state = await this.readState(issueNumber);
    if (!state) {
      throw new Error('State not found');
    }

    state.cursor_task_id = taskId;
    state.version += 1;
    return await this.writeState(issueNumber, state);
  }

  async setPaused(issueNumber, paused) {
    const state = await this.readState(issueNumber);
    if (!state) {
      throw new Error('State not found');
    }

    state.paused = paused;
    state.version += 1;
    return await this.writeState(issueNumber, state);
  }
}

module.exports = { StateManager };
