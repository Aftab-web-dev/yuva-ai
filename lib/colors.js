const pc = require('picocolors');

const COLOR_MAP = {
  reset: pc.reset,
  bright: pc.bold,
  dim: pc.dim,
  green: pc.green,
  yellow: pc.yellow,
  blue: pc.blue,
  cyan: pc.cyan,
  red: pc.red,
  magenta: pc.magenta,
  white: pc.white,
  bgGreen: pc.bgGreen,
  bgRed: pc.bgRed,
  bgYellow: pc.bgYellow,
  bgBlue: pc.bgBlue,
};

function colorize(text, color) {
  const fn = COLOR_MAP[color];
  return fn ? fn(text) : text;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function success(message) { log(`✅ ${message}`, 'green'); }
function warn(message) { log(`⚠️  ${message}`, 'yellow'); }
function error(message) { log(`❌ ${message}`, 'red'); }
function info(message) { log(`ℹ️  ${message}`, 'blue'); }
function heading(message) { log(`\n${message}`, 'bright'); }

function box(title, color = 'cyan') {
  const line = '═'.repeat(58);
  log(`\n╔${line}╗`, color);
  log(`║     ${title.padEnd(53)}║`, color);
  log(`╚${line}╝\n`, color);
}

function table(headers, rows) {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i] || '').length))
  );
  const separator = colWidths.map(w => '─'.repeat(w + 2)).join('┼');

  const formatRow = (row) => row.map((cell, i) =>
    ` ${String(cell).padEnd(colWidths[i])} `
  ).join('│');

  log('┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐', 'dim');
  log('│' + formatRow(headers) + '│', 'bright');
  log('├' + separator + '┤', 'dim');
  rows.forEach(row => log('│' + formatRow(row) + '│'));
  log('└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘', 'dim');
}

module.exports = { colorize, log, success, warn, error, info, heading, box, table };
