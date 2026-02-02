const { minimatch } = require('minimatch');

class PolicyManager {
  constructor(config) {
    this.config = config;
    this.allowlistGlobs = config.merge_policy.l1.allowlist_globs;
    this.sensitiveGlobs = config.merge_policy.sensitive_globs;
    this.maxChangedFiles = config.merge_policy.max_changed_files_l1;
  }

  analyzeChangedFiles(files) {
    const fileNames = files.map(f => f.filename);
    
    if (fileNames.length > this.maxChangedFiles) {
      return {
        level: 'L3',
        reason: `Too many changed files (${fileNames.length} > ${this.maxChangedFiles})`
      };
    }

    const sensitiveFiles = fileNames.filter(f => 
      this.sensitiveGlobs.some(glob => minimatch(f, glob))
    );

    if (sensitiveFiles.length > 0) {
      return {
        level: 'L3',
        reason: `Sensitive files modified: ${sensitiveFiles.join(', ')}`,
        sensitiveFiles
      };
    }

    const allowlistFiles = fileNames.filter(f =>
      this.allowlistGlobs.some(glob => minimatch(f, glob))
    );

    if (allowlistFiles.length === fileNames.length) {
      return {
        level: 'L1',
        reason: 'All files match allowlist',
        allowlistFiles
      };
    }

    return {
      level: 'L2',
      reason: 'Some files outside allowlist but not sensitive',
      nonAllowlistFiles: fileNames.filter(f => !allowlistFiles.includes(f))
    };
  }

  determineMergeLevel(prFiles, declaredLevel) {
    const analysis = this.analyzeChangedFiles(prFiles);
    
    const levelPriority = { 'L1': 1, 'L2': 2, 'L3': 3 };
    const analyzedPriority = levelPriority[analysis.level];
    const declaredPriority = levelPriority[declaredLevel] || 1;
    
    const finalLevel = analyzedPriority > declaredPriority ? analysis.level : declaredLevel;
    
    return {
      finalLevel,
      declaredLevel,
      analyzedLevel: analysis.level,
      reason: analysis.reason,
      details: analysis
    };
  }

  async canAutoMerge(github, prNumber) {
    try {
      const pr = await github.getPR(prNumber);
      
      if (!pr.mergeable) {
        return { canMerge: false, reason: 'PR has conflicts' };
      }

      if (pr.draft) {
        return { canMerge: false, reason: 'PR is draft' };
      }

      return { canMerge: true };
    } catch (e) {
      return { canMerge: false, reason: `Error checking PR: ${e.message}` };
    }
  }

  async executeMergeStrategy(github, prNumber, level, ciPassed) {
    if (!ciPassed) {
      return {
        action: 'wait',
        reason: 'CI has not passed'
      };
    }

    const mergeCheck = await this.canAutoMerge(github, prNumber);
    if (!mergeCheck.canMerge) {
      return {
        action: 'blocked',
        reason: mergeCheck.reason
      };
    }

    switch (level) {
      case 'L1':
        try {
          await github.mergePR(prNumber, 'squash');
          return {
            action: 'merged',
            reason: 'L1 auto-merge executed'
          };
        } catch (e) {
          return {
            action: 'downgrade_to_l2',
            reason: `Auto-merge failed: ${e.message}. Downgrading to L2.`
          };
        }

      case 'L2':
        return {
          action: 'wait_for_approval',
          reason: 'L2 requires /approve-task command'
        };

      case 'L3':
        return {
          action: 'wait_for_review',
          reason: 'L3 requires PR rel'
        };

      default:
        return {
          action: 'blocked',
          reason: `Unknown level: ${level}`
        };
    }
  }
}

module.exports = { PolicyManager };
