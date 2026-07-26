/**
 * Yuva AI — programmatic API entry point.
 * Exposes the core modules for use as a library (not just CLI).
 */

const { NeuralGraph, NODE_TYPES, EDGE_TYPES } = require('./lib/neural-graph');
const { GraphBuilder } = require('./lib/graph-builder');
const { TaskBus, TASK_STATUSES, STALE_WORKER_MS } = require('./lib/task-bus');
const { LoopEngine, extractJSON, normalizePlannedTasks, normalizeReview } = require('./lib/loop-engine');
const { PromptEnforcer, formatEnforcementResult, PROTECTED_PATTERNS } = require('./lib/prompt-enforcer');
const { FileConflictManager } = require('./lib/file-conflict');
const { GitIsolation } = require('./lib/git-isolation');
const { CostTracker, MODEL_COSTS, CHARS_PER_TOKEN } = require('./lib/cost-tracker');
const { StreamingWorker } = require('./lib/streaming-worker');
const { runSecurityScan, formatSecurityReport } = require('./lib/security-scanner');
const { runPluginGates, formatPluginGates, BUILTIN_RULES } = require('./lib/plugin-gates');
const { detectGates, runGates, runAllGates, GATE_ORDER } = require('./lib/gate-runner');
const { analyzeCodebase, formatAnalysis } = require('./lib/code-analyzer');
const { scanProject, formatContextForPrompt, injectContext } = require('./lib/prompt-engine');
const { SessionManager } = require('./lib/session-manager');
const { buildWorkPackage, ROLES, resolveTemplateFile } = require('./lib/work-package');
const { resolveWorkingCli, preflight, commandExists, diagnose } = require('./lib/ai-cli');
const { buildSpawnSpec, openTerminal } = require('./lib/terminal-spawn');

module.exports = {
  // Core
  NeuralGraph, NODE_TYPES, EDGE_TYPES,
  GraphBuilder,
  TaskBus, TASK_STATUSES, STALE_WORKER_MS,
  LoopEngine,
  PromptEnforcer, formatEnforcementResult, PROTECTED_PATTERNS,
  FileConflictManager,
  GitIsolation,
  CostTracker, MODEL_COSTS, CHARS_PER_TOKEN,
  StreamingWorker,
  SessionManager,
  buildWorkPackage, ROLES, resolveTemplateFile,

  // Scanning / Analysis
  runSecurityScan, formatSecurityReport,
  runPluginGates, formatPluginGates, BUILTIN_RULES,
  detectGates, runGates, runAllGates, GATE_ORDER,
  analyzeCodebase, formatAnalysis,
  scanProject, formatContextForPrompt, injectContext,

  // AI CLI
  resolveWorkingCli, preflight, commandExists, diagnose,

  // Utilities
  extractJSON, normalizePlannedTasks, normalizeReview,
  buildSpawnSpec, openTerminal,
};
