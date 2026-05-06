import { describe, expect, test } from 'vitest';
import { runInstructionWithLogging } from '../../src/runner/instruction-runner.js';
import type { GuiRunner } from '../../src/agent/lark-agent.js';
import type { RunEvent } from '../../src/logging/run-logger.js';

function createMemoryLogger() {
  const events: RunEvent[] = [];

  return {
    events,
    logger: {
      runDir: 'runs/run-001',
      eventsPath: 'runs/run-001/events.jsonl',
      write(event: RunEvent) {
        events.push(event);
      }
    }
  };
}

describe('runInstructionWithLogging', () => {
  test('logs start and finish events around a successful runner call', async () => {
    const calls: string[] = [];
    const runner: GuiRunner<void> = {
      async run(instruction: string) {
        calls.push(instruction);
      }
    };
    const { events, logger } = createMemoryLogger();

    const result = await runInstructionWithLogging({
      instruction: '打开飞书',
      runner,
      logger,
      now: () => new Date('2026-05-06T07:00:00.000Z')
    });

    expect(calls).toEqual(['打开飞书']);
    expect(result.status).toBe('passed');
    expect(result.eventsPath).toBe('runs/run-001/events.jsonl');
    expect(events).toEqual([
      {
        type: 'run.started',
        timestamp: '2026-05-06T07:00:00.000Z',
        payload: { instruction: '打开飞书' }
      },
      {
        type: 'run.finished',
        timestamp: '2026-05-06T07:00:00.000Z',
        payload: { instruction: '打开飞书' }
      }
    ]);
  });

  test('logs failed events and rethrows runner errors', async () => {
    const runner: GuiRunner<void> = {
      async run() {
        throw new Error('desktop denied');
      }
    };
    const { events, logger } = createMemoryLogger();

    await expect(
      runInstructionWithLogging({
        instruction: '打开飞书',
        runner,
        logger,
        now: () => new Date('2026-05-06T07:00:00.000Z')
      })
    ).rejects.toThrow('desktop denied');

    expect(events[1]).toEqual({
      type: 'run.failed',
      timestamp: '2026-05-06T07:00:00.000Z',
      payload: {
        instruction: '打开飞书',
        error: 'desktop denied'
      }
    });
  });
});

