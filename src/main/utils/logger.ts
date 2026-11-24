/**
 * Application Logger
 * 
 * Simple file-based logging with rotation.
 */

import fs from 'fs';
import path from 'path';
import { getLogsPath } from './paths';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_FILE = 'app.log';
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LOG_FILES = 3;

class Logger {
  private logPath: string;
  private stream: fs.WriteStream | null = null;

  constructor() {
    this.logPath = path.join(getLogsPath(), LOG_FILE);
    this.rotateIfNeeded();
    this.openStream();
  }

  private openStream(): void {
    this.stream = fs.createWriteStream(this.logPath, { flags: 'a' });
  }

  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logPath)) return;
      
      const stats = fs.statSync(this.logPath);
      if (stats.size < MAX_LOG_SIZE) return;

      // Close current stream
      this.stream?.end();

      // Rotate files: app.log -> app.1.log -> app.2.log -> delete
      for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
        const from = path.join(getLogsPath(), `app.${i}.log`);
        const to = path.join(getLogsPath(), `app.${i + 1}.log`);
        if (fs.existsSync(from)) {
          if (i === MAX_LOG_FILES - 1) {
            fs.unlinkSync(from);
          } else {
            fs.renameSync(from, to);
          }
        }
      }

      // Rename current log
      fs.renameSync(this.logPath, path.join(getLogsPath(), 'app.1.log'));
    } catch (err) {
      console.error('Log rotation failed:', err);
    }
  }

  private write(level: LogLevel, message: string, meta?: object): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    const line = `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}\n`;

    // Write to file
    this.stream?.write(line);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const consoleFn = level === 'error' ? console.error : 
                        level === 'warn' ? console.warn : 
                        console.log;
      consoleFn(`[${level.toUpperCase()}] ${message}`, meta || '');
    }
  }

  debug(message: string, meta?: object): void {
    if (process.env.NODE_ENV === 'development') {
      this.write('debug', message, meta);
    }
  }

  info(message: string, meta?: object): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: object): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: object): void {
    this.write('error', message, meta);
  }

  close(): void {
    this.stream?.end();
    this.stream = null;
  }
}

// Singleton instance
let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

export const logger = {
  debug: (msg: string, meta?: object) => getLogger().debug(msg, meta),
  info: (msg: string, meta?: object) => getLogger().info(msg, meta),
  warn: (msg: string, meta?: object) => getLogger().warn(msg, meta),
  error: (msg: string, meta?: object) => getLogger().error(msg, meta),
};
