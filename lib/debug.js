/**
 * Lightweight debug logger for yuva-ai.
 * Respects YUVA_DEBUG=1 env var. Silent by default (no performance cost).
 */

const DEBUG = process.env.YUVA_DEBUG === '1' || process.env.YUVA_DEBUG === 'true';

function debug(module, message, err) {
  if (!DEBUG) return;
  const ts = new Date().toISOString();
  const prefix = `[yuva:${module}] ${ts}`;
  if (err) {
    console.error(`${prefix} ${message}: ${err.message || err}`);
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Wrap a catch block to log the error instead of silently swallowing it.
 * Usage: catch (logCatch('neural-graph', 'load failed'))
 */
function logCatch(module, message) {
  return (err) => debug(module, message, err);
}

module.exports = { debug, logCatch, DEBUG };
