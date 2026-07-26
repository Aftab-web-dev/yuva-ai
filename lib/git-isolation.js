const { execSync } = require('child_process');
const path = require('path');

/**
 * Git branch isolation for workers.
 * Each worker gets its own branch; changes are merged only after gates pass.
 * Failed tasks get their branch discarded (rollback).
 */

class GitIsolation {
  constructor(targetDir) {
    this.targetDir = targetDir;
  }

  /** Escape a string for safe use in a shell command (single-quote wrapping). */
  _shellEscape(str) {
    // Wrap in single quotes; escape embedded single quotes via '\''
    return "'" + String(str).replace(/'/g, "'\\''") + "'";
  }

  _exec(cmd) {
    try {
      return execSync(cmd, {
        cwd: this.targetDir,
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe',
      }).trim();
    } catch (err) {
      throw new Error(`Git command failed: ${cmd}\n${err.stderr || err.message}`);
    }
  }

  _execSafe(cmd) {
    try {
      return { ok: true, output: this._exec(cmd) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  /**
   * Check why isolation is unavailable and return a descriptive status.
   * Returns { available, reason, suggestion }.
   */
  getStatus() {
    const repoCheck = this._execSafe('git rev-parse --is-inside-work-tree');
    if (!repoCheck.ok || repoCheck.output !== 'true') {
      return {
        available: false,
        reason: 'Not a git repository',
        suggestion: 'Run `git init` to enable branch isolation, or use --no-isolate to skip',
      };
    }

    const status = this._execSafe('git status --porcelain');
    if (status.ok && status.output && status.output.trim() !== '') {
      const changedFiles = status.output.trim().split('\n').length;
      return {
        available: false,
        reason: `Working tree is dirty (${changedFiles} uncommitted change(s))`,
        suggestion: 'Commit or stash changes first (`git stash`), or use --no-isolate to skip',
        dirtyFiles: status.output.trim().split('\n').slice(0, 5),
      };
    }

    const headCheck = this._execSafe('git symbolic-ref -q HEAD');
    if (!headCheck.ok) {
      return {
        available: false,
        reason: 'Detached HEAD state',
        suggestion: 'Checkout a branch first, or use --no-isolate to skip',
      };
    }

    return { available: true, reason: null, suggestion: null };
  }

  /**
   * Check if we're in a git repo with a clean working tree.
   */
  isReady() {
    const r = this._execSafe('git rev-parse --is-inside-work-tree');
    if (!r.ok || r.output !== 'true') return false;
    const status = this._execSafe('git status --porcelain');
    return status.ok && status.output === '';
  }

  /**
   * Get the current branch name.
   */
  getCurrentBranch() {
    return this._exec('git rev-parse --abbrev-ref HEAD');
  }

  /**
   * Create a worker branch from the current HEAD.
   * Returns the branch name.
   */
  createWorkerBranch(workerId, taskId) {
    const branchName = `yuva/worker-${workerId}/task-${taskId}`;
    this._exec(`git checkout -b "${branchName}"`);
    return branchName;
  }

  /**
   * Stage all changes and commit with a message.
   */
  commitChanges(message) {
    this._exec('git add -A');
    // Check if there's anything to commit
    const status = this._exec('git status --porcelain');
    if (!status) return null; // nothing to commit
    this._exec(`git commit -m ${this._shellEscape(message)}`);
    return this._exec('git rev-parse HEAD');
  }

  /**
   * Merge a worker branch back into the main branch.
   * Returns true on success.
   */
  mergeToMain(workerBranch, mainBranch) {
    try {
      this._exec(`git checkout ${this._shellEscape(mainBranch)}`);
      this._exec(`git merge --no-ff ${this._shellEscape(workerBranch)} -m ${this._shellEscape('yuva: merge ' + workerBranch)}`);
      return { ok: true };
    } catch (err) {
      // Merge conflict — abort and report
      this._execSafe('git merge --abort');
      return { ok: false, error: err.message, conflict: true };
    }
  }

  /**
   * Discard a worker branch (rollback).
   */
  discardBranch(workerBranch, mainBranch) {
    this._execSafe(`git checkout ${this._shellEscape(mainBranch)}`);
    this._execSafe(`git branch -D ${this._shellEscape(workerBranch)}`);
  }

  /**
   * Get the diff of the current branch vs the main branch.
   */
  getDiff(mainBranch) {
    return this._execSafe(`git diff ${this._shellEscape(mainBranch)} --stat`);
  }

  /**
   * Get files changed on the current branch.
   */
  getChangedFiles(mainBranch) {
    const result = this._execSafe(`git diff ${this._shellEscape(mainBranch)} --name-only`);
    if (!result.ok) return [];
    return result.output ? result.output.split('\n').filter(Boolean) : [];
  }

  /**
   * Stash any uncommitted changes (for recovery).
   */
  stash(message = 'yuva auto-stash') {
    return this._execSafe(`git stash push -m ${this._shellEscape(message)}`);
  }

  /**
   * Pop the last stash.
   */
  unstash() {
    return this._execSafe('git stash pop');
  }

  /**
   * Full workflow: create branch → do work → commit → merge or rollback.
   * The `workFn` callback should do the actual work and return { success, summary }.
   */
  async isolateTask(workerId, taskId, workFn) {
    const mainBranch = this.getCurrentBranch();
    let workerBranch = null;

    try {
      // Create isolated branch
      workerBranch = this.createWorkerBranch(workerId, taskId);

      // Do the work
      const result = await workFn();

      if (result.success) {
        // Commit changes
        const commit = this.commitChanges(`yuva: task ${taskId} — ${result.summary || 'completed'}`);

        if (commit) {
          // Merge back
          const merge = this.mergeToMain(workerBranch, mainBranch);
          if (!merge.ok) {
            return {
              success: false,
              error: `Merge conflict: ${merge.error}`,
              branch: workerBranch,
              needsManualMerge: true,
            };
          }
        }

        return { success: true, branch: workerBranch, commit };
      } else {
        // Work failed — rollback
        this.discardBranch(workerBranch, mainBranch);
        return { success: false, error: result.error, rolledBack: true };
      }
    } catch (err) {
      // Unexpected error — rollback
      if (workerBranch) {
        this.discardBranch(workerBranch, mainBranch);
      }
      return { success: false, error: err.message, rolledBack: true };
    }
  }
}

module.exports = { GitIsolation };
