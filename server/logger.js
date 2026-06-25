const LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const COLORS = { ERROR: '\x1b[31m', WARN: '\x1b[33m', INFO: '\x1b[36m', DEBUG: '\x1b[90m' };
const RESET = '\x1b[0m';

function log(level, module, message, data = {}) {
  const ts = new Date().toISOString();
  const color = COLORS[level] || '';
  const prefix = `${color}[${ts}] [${level}] [${module}]${RESET}`;
  console.log(`${prefix} ${message}`, Object.keys(data).length ? data : '');
}

export default {
  info: (module, msg, data) => log('INFO', module, msg, data),
  warn: (module, msg, data) => log('WARN', module, msg, data),
  error: (module, msg, data) => log('ERROR', module, msg, data),
  debug: (module, msg, data) => log('DEBUG', module, msg, data),
};
