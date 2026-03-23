import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import config from '../config.js';

const logPath = join(process.cwd(), config.logPath);

function log(level, message) {
  const entry = `[${new Date().toISOString()}] [${level}] ${message}\n`;
  process.stdout.write(entry);
  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, entry);
  } catch {
    // Console output already happened — swallow file write failures silently
  }
}

export const logger = {
  info:  (msg) => log('INFO',  msg),
  warn:  (msg) => log('WARN',  msg),
  error: (msg) => log('ERROR', msg),
};
