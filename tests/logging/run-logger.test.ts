import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  createRunLogger,
  createRunName,
  type RunEvent
} from '../../src/logging/run-logger.js';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('createRunName', () => {
  test('creates filesystem-safe names from case id and timestamp', () => {
    const name = createRunName('im/send message 001', new Date('2026-05-06T06:30:15.000Z'));

    expect(name).toBe('2026-05-06T06-30-15-000Z-im-send-message-001');
  });
});

describe('createRunLogger', () => {
  test('writes events as JSON lines under a run directory', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'cua-lark-runs-'));
    tempDirs.push(rootDir);
    const logger = createRunLogger({
      rootDir,
      runName: 'run-001'
    });
    const event: RunEvent = {
      type: 'runner.data',
      timestamp: '2026-05-06T06:30:15.000Z',
      payload: { status: 'RUNNING' }
    };

    logger.write(event);

    const content = readFileSync(join(rootDir, 'run-001', 'events.jsonl'), 'utf8');
    expect(content).toBe(`${JSON.stringify(event)}\n`);
    expect(logger.runDir).toBe(join(rootDir, 'run-001'));
    expect(logger.eventsPath).toBe(join(rootDir, 'run-001', 'events.jsonl'));
  });
});

