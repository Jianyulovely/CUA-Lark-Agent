import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface RunEvent {
  type: string;
  timestamp: string;
  payload?: unknown;
}

export interface RunLogger {
  runDir: string;
  eventsPath: string;
  write(event: RunEvent): void;
}

export interface RunLoggerOptions {
  rootDir: string;
  runName: string;
}

export function createRunName(caseId: string, date = new Date()): string {
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  const safeCaseId = caseId
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return `${timestamp}-${safeCaseId || 'run'}`;
}

export function createRunLogger(options: RunLoggerOptions): RunLogger {
  const runDir = join(options.rootDir, options.runName);
  const eventsPath = join(runDir, 'events.jsonl');
  mkdirSync(runDir, { recursive: true });

  return {
    runDir,
    eventsPath,
    write(event: RunEvent) {
      appendFileSync(eventsPath, `${JSON.stringify(event)}\n`, 'utf8');
    }
  };
}

