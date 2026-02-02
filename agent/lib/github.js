const { Octokit } = require('@octokit/rest');

class GitHubClient {
  constructor(token, owner, repo) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner;
    this.repo = repo;
  }

  async getIssue(issueNumber) {
    const { data } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber
    });
    return data;
  }

  async createComment(issueNumber, body) {
    const { data } = await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body
    });
    return data;
  }

  async updateIssue(issueNumber, updates) {
    const { data } = await this.octokit.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      ...updates
    });
    return data;
  }

  async addLabels(issueNumber, labels) {
    await this.octokit.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      labels
    });
  }

  async removeLabel(issueNumber, label) {
    await this.octokit.issues.removeLabel({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      name: label
    });
  }

  async assignIssue(issueNumber, assignees) {
    await this.octokit.issues.addAssignees({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      assignees
    });
  }

  async listComments(issueNumber) {
    const { data } = await this.octokit.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      per_page: 100
    });
    return data;
  }

  async updateComment(commentId, body) {
    await this.octokit.issues.updateComment({
      owner: this.owner,
      repo: this.repo,
      comment_id: commentId,
      body
    });
  }

  async getPR(prNumber) {
    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber
    });
    return data;
  }

  async listPRFiles(prNumber) {
    const { data } = await this.octokit.pulls.listFiles({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      per_page: 100
    });
    return data;
  }

  async mergePR(prNumber, mergeMethod = 'squash') {
    await this.octokit.pulls.merge({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      merge_method: mergeMethod
    });
  }

  async createCheckRun(name, headSha, status, conclusion, output) {
    const { data } = await this.octokit.checks.create({
      owner: this.owner,
      repo: this.repo,
      name,
      head_sha: headSha,
      status,
      conclusion,
      output
    });
    return data;
  }

  async dispatchWorkflow(workflowId, ref, inputs) {
    await this.octokit.actions.createWorkflowDispatch({
      owner: this.owner,
      repo: this.repo,
      workflow_id: workflowId,
      ref,
      inputs
    });
  }

  async getContent(path, ref = 'main') {
    const { data } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path,
      ref
    });
    return data;
  }
}

module.exports = { GitHubClient };
