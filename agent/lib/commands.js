class CommandParser {
  constructor(config) {
    this.config = config;
    this.commands = {
      approve_task: config.commands.approve_task,
      pause: config.commands.pause,
      resume: config.commands.resume,
      retry: config.commands.retry,
      abort: config.commands.abort
    };
  }

  parseCommand(commentBody) {
    const lines = commentBody.trim().split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === this.commands.approve_task) {
        return { command: 'approve_task', args: {} };
      }
      if (trimmed === this.commands.pause) {
        return { command: 'pause', args: {} };
      }
      if (trimmed === this.commands.resume) {
        return { command: 'resume', args: {} };
      }
      if (trimmed === this.commands.retry) {
        return { command: 'retry', args: {} };
      }
      if (trimmed === this.commands.abort) {
        return { command: 'abort', args: {} };
      }
    }
    
    return null;
  }

  isValidActor(authorAssociation) {
    const validAssociations = ['OWNER', 'MEMBER', 'COLLABORATOR'];
    return validAssociations.includes(authorAssociation);
  }

  validateCommand(command, context) {
    if (!command) {
      return { valid: false, error: 'No command found' };
    }

    if (!this.isValidActor(context.authorAssociation)) {
      return { 
        valid: false, 
        error: 'Only repository collaborators can use agent commands' 
      };
    }

    switch (command.command) {
      case 'approve_task':
        if (!context.prNumber) {
          return { valid: false, error: '/approve-task must be used on a PR' };
        }
        break;
      
      case 'pause':
      case 'resume':
      case 'retry':
      case 'abort':
        if (!context.parentIssue) {
          return { valid: false, error: `${command.command} must be used on a parent issue` };
        }
        break;
    }

    return { valid: true };
  }
}

module.exports = { CommandParser };
