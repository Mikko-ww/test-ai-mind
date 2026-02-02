#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');
const core = require('@actions/core');

class GitHubClient {
  constructor(token, owner, repo) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async getIssue(issueNumber) {
    try {
      const { data } = await this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber
      });
      return data;
    } catch (error) {
      core.error(`Failed to get issue #${issueNumber}: ${error.message}`);
      throw error;
    }
  }

  async createComment(issueNumber, body) {
    try {
      const { data } = await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body
      });
      return data;
    } catch (error) {
      core.error(`Failed to create comment on issue #${issueNumber}: ${error.message}`);
      throw error;
    }
  }

  async addLabels(issueNumber, labels) {
    try {
      const { data } = await this.octokit.rest.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        labels
      });
      return data;
    } catch (error) {
      core.error(`Failed to add labels to issue #${issueNumber}: ${error.message}`);
      throw error;
    }
  }

  async removeLabel(issueNumber, label) {
    try {
      await this.octokit.rest.issues.removeLabel({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        name: label
      });
    } catch (error) {
      if (error.status !== 404) {
        core.error(`Failed to remove label from issue #${issueNumber}: ${error.message}`);
        throw error;
      }
    }
  }

  async updateIssue(issueNumber, updates) {
    try {
      const { data } = await this.octokit.rest.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        ...updates
      });
      return data;
    } catch (error) {
      core.error(`Failed to update issue #${issueNumber}: ${error.message}`);
      throw error;
    }
  }

  async createPR(title, head, base, body) {
    try {
      const { data } = await this.octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        head,
        base,
        body
      });
      return data;
    } catch (error) {
      core.error(`Failed to create PR: ${error.message}`);
      throw error;
    }
  }

  async mergePR(prNumber, mergeMethod = 'squash') {
    try {
      const { data } = await this.octokit.rest.pulls.merge({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
        merge_method: mergeMethod
      });
      return data;
    } catch (error) {
      core.error(`Failed to merge PR #${prNumber}: ${error.message}`);
      throw error;
    }
  }

  async listComments(issueNumber, perPage = 100) {
    try {
      const comments = await this.octokit.paginate(
        this.octokit.rest.issues.listComments,
        {
          owner: this.owner,
          repo: this.repo,
          issue_number: issueNumber,
          per_page: perPage
        }
      );
      return comments;
    } catch (error) {
      core.error(`Failed to list comments for issue #${issueNumber}: ${error.message}`);
      throw error;
    }
  }

  async getPR(prNumber) {
    try {
      const { data } = await this.octokit.rest.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });
      return data;
    } catch (error) {
      core.error(`Failed to get PR #${prNumber}: ${error.message}`);
      throw error;
    }
  }

  async listPRFiles(prNumber, perPage = 100) {
    try {
      const files = await this.octokit.paginate(
        this.octokit.rest.pulls.listFiles,
        {
          owner: this.owner,
          repo: this.repo,
          pull_number: prNumber,
          per_page: perPage
        }
      );
      return files;
    } catch (error) {
      core.error(`Failed to list files for PR #${prNumber}: ${error.message}`);
      throw error;
    }
  }

  async createWorkflowDispatch(workflowId, ref, inputs = {}) {
    try {
      await this.octokit.rest.actions.createWorkflowDispatch({
        owner: this.owner,
        repo: this.repo,
        workflow_id: workflowId,
        ref,
        inputs
      });
    } catch (error) {
      core.error(`Failed to dispatch workflow ${workflowId}: ${error.message}`);
      throw error;
    }
  }

  async createCheckRun(name, headSha, status, output = {}) {
    try {
      const { data } = await this.octokit.rest.checks.create({
        owner: this.owner,
        repo: this.repo,
        name,
        head_sha: headSha,
        status,
        started_at: new Date().toISOString(),
        output
      });
      return data;
    } catch (error) {
      core.error(`Failed to create check run: ${error.message}`);
      throw error;
    }
  }

  async updateCheckRun(checkRunId, status, conclusion, output = {}) {
    try {
      const params = {
        owner: this.owner,
        repo: this.repo,
        check_run_id: checkRunId,
        status
      };

      if (status === 'completed') {
        params.conclusion = conclusion;
        params.completed_at = new Date().toISOString();
      }

      if (output && Object.keys(output).length > 0) {
        params.output = output;
      }

      const { data } = await this.octokit.rest.checks.update(params);
      return data;
    } catch (error) {
      core.error(`Failed to update check run #${checkRunId}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { GitHubClient };
