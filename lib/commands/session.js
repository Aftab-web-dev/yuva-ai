const { execSync } = require('child_process');
const { SessionManager } = require('../session-manager');
const { log, success, warn, error, info, heading, colorize } = require('../colors');

function showSessionHelp() {
  heading('Session Commands:');
  log('  session start "goal"          Start a new development session');
  log('  session log "message"         Log a work entry (--type code|decision|todo|issue)');
  log('  session decision "what" "why" Record a decision');
  log('  session save "summary"        Save checkpoint');
  log('  session resume                Resume with full context');
  log('  session status                Show current session info');
  log('  session end                   End current session');
  log('  session clear                 Clear session files\n');
}


function run(subArgs, flags) {
  const sm = new SessionManager(process.cwd());
  const subcommand = subArgs[0];
  const rest = subArgs.slice(1);

  switch (subcommand) {
    case 'start': {
      const goal = rest.join(' ') || 'Unnamed session';
      if (sm.hasActiveSession()) {
        const existing = sm.getSession();
        warn(`Session already active: "${existing.goal}"`);
        return;
      }
      const session = sm.start({ goal });
      success(`Session started: "${session.goal}"`);
      info(`ID: ${session.id}`);
      break;
    }

    case 'log': {
      const type = flags.type || 'note';
      const message = rest.join(' ');
      if (!message) {
        error('Please provide a message to log.');
        return;
      }
      sm.log(message, { type });
      success(`Logged [${type}]: ${message}`);
      break;
    }

    case 'decision': {
      const what = rest[0];
      const why = rest[1];
      if (!what || !why) {
        error('Usage: session decision "what" "why"');
        return;
      }
      sm.decision(what, why);
      success(`Decision recorded: ${what}`);
      break;
    }

    case 'save': {
      const summary = rest.join(' ') || undefined;
      let filesChanged;
      try {
        const diff = execSync('git diff --name-only HEAD', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        filesChanged = diff.trim().split('\n').filter(Boolean);
      } catch {
        filesChanged = undefined;
      }
      sm.save({ summary, filesChanged });
      success('Checkpoint saved.');
      if (summary) info(`Summary: ${summary}`);
      break;
    }

    case 'resume': {
      const content = sm.resume();
      if (content === 'No active session') {
        warn('No active session to resume.');
        return;
      }
      log(content);
      break;
    }

    case 'status': {
      const session = sm.getSession();
      if (!session) {
        warn('No session found.');
        return;
      }
      heading('Session Status');
      log(`  Goal:      ${session.goal}`);
      log(`  Status:    ${session.status}`);
      log(`  Phase:     ${session.phase}`);
      log(`  Started:   ${session.startedAt}`);
      log(`  Entries:   ${session.entries.length}`);
      log(`  Files:     ${session.filesChanged.length}`);
      log(`  Decisions: ${session.decisions.length}\n`);
      break;
    }

    case 'end': {
      if (!sm.hasActiveSession()) {
        warn('No active session to end.');
        return;
      }
      sm.end();
      success('Session ended.');
      break;
    }

    case 'clear': {
      sm.clear();
      success('Session files cleared.');
      break;
    }

    default:
      showSessionHelp();
      break;
  }
}

module.exports = { run };
