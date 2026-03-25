import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import config from '../config.ts';

const logPath = join(process.cwd(), config.logPath);

function log(level: string, message: string): void {
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
  info:  (msg: string) => log('INFO',  msg),
  warn:  (msg: string) => log('WARN',  msg),
  error: (msg: string) => log('ERROR', msg),
};
