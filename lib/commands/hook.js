const fs = require('fs');
const { checkFileOp, checkBashCommand } = require('../enforcement-rules');

const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

/** Pure decision function — given a PreToolUse payload, return a deny reason or null to allow. */
function decide({ tool_name, tool_input, cwd } = {}, workingDir = process.cwd()) {
  const dir = cwd || workingDir;
  if (FILE_TOOLS.has(tool_name)) {
    return checkFileOp(tool_name, tool_input, dir);
  }
  if (tool_name === 'Bash') {
    return checkBashCommand(tool_input && tool_input.command);
  }
  return null;
}

function readStdinJSON() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** `yuva hook pretooluse` — Claude Code PreToolUse command hook. Reads the
 * tool-call payload from stdin, denies it if it violates enforcement rules,
 * otherwise stays silent so Claude Code's normal permission flow applies. */
function pretooluse() {
  const payload = readStdinJSON();
  const reason = decide(payload);
  if (reason) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }));
  }
  process.exit(0);
}

function hookCommand(args = []) {
  const action = args[0];
  switch (action) {
    case 'pretooluse':
      return pretooluse();
    default:
      process.stderr.write('Usage: yuva hook pretooluse   (reads a PreToolUse payload from stdin)\n');
      process.exit(1);
  }
}

module.exports = hookCommand;
module.exports.decide = decide;
