import { describe, expect, test } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GuiRunner } from '../../src/agent/lark-agent.js';
import type { DesktopController, ScreenshotResult } from '../../src/desktop/desktop-controller.js';
import type { RunEvent, RunLogger } from '../../src/logging/run-logger.js';
import { runAiFirstImSmoke } from '../../src/runner/ai-im-smoke-runner.js';
import type { ImSmokeRunResult } from '../../src/runner/im-smoke-runner.js';
import type { MessageVerifier } from '../../src/verifier/message-verifier.js';

class FakeDesktop implements DesktopController {
  actions: string[] = [];

  async openApp(appName: string): Promise<void> {
    this.actions.push(`open:${appName}`);
  }

  async openGlobalSearch(): Promise<void> {
    this.actions.push('search');
  }

  async openFirstSearchResult(): Promise<void> {
    this.actions.push('open-result');
  }

  async pasteText(text: string): Promise<void> {
    this.actions.push(`paste:${text}`);
  }

  async pressEnter(): Promise<void> {
    this.actions.push('enter');
  }

  async wait(ms: number): Promise<void> {
    this.actions.push(`wait:${ms}`);
  }

  async screenshot(name: string): Promise<ScreenshotResult> {
    this.actions.push(`screenshot:${name}`);
    return {
      path: join('runs', 'demo', `${name}.png`),
      base64: 'base64'
    };
  }
}

function createMemoryLogger(): { logger: RunLogger; events: RunEvent[] } {
  const events: RunEvent[] = [];
  const runDir = mkdtempSync(join(tmpdir(), 'cua-lark-ai-im-smoke-'));
  return {
    events,
    logger: {
      runDir,
      eventsPath: join(runDir, 'events.jsonl'),
      write(event: RunEvent) {
        events.push(event);
      }
    }
  };
}

describe('runAiFirstImSmoke', () => {
  test('runs the visual action loop, screenshots the result, and verifies the target message', async () => {
    const instructions: string[] = [];
    const runner: GuiRunner<void> = {
      async run(instruction) {
        instructions.push(instruction);
      }
    };
    const desktop = new FakeDesktop();
    const verifier: MessageVerifier = {
      async verify(input) {
        return {
          passed: input.message === 'CUA-Lark test 2026-05-07T01:00:00.000Z',
          reason: 'message visible'
        };
      }
    };
    const { logger, events } = createMemoryLogger();

    const result = await runAiFirstImSmoke({
      groupName: 'CUA-Lark test group',
      messagePrefix: 'CUA-Lark test',
      runner,
      desktop,
      verifier,
      logger,
      now: () => new Date('2026-05-07T01:00:00.000Z')
    });

    expect(result.status).toBe('passed');
    expect(result.mode).toBe('vision-loop');
    expect(result.message).toBe('CUA-Lark test 2026-05-07T01:00:00.000Z');
    expect(desktop.actions[0]).toBe('open:Feishu');
    expect(instructions[0]).toContain('CUA-Lark test group');
    expect(instructions[0]).toContain('CUA-Lark test 2026-05-07T01:00:00.000Z');
    expect(desktop.actions).toContain('screenshot:ai-final-message');
    expect(events.map((event) => event.type)).toContain('ai_im.verification');
  });

  test('can start from an already focused Feishu window', async () => {
    const runner: GuiRunner<void> = {
      async run() {
        return undefined;
      }
    };
    const desktop = new FakeDesktop();
    const verifier: MessageVerifier = {
      async verify() {
        return { passed: true, reason: 'message visible' };
      }
    };
    const { logger } = createMemoryLogger();

    await runAiFirstImSmoke({
      groupName: 'CUA-Lark test group',
      messagePrefix: 'CUA-Lark test',
      openApp: false,
      runner,
      desktop,
      verifier,
      logger,
      now: () => new Date('2026-05-07T01:00:00.000Z')
    });

    expect(desktop.actions[0]).toBe('wait:1200');
    expect(desktop.actions).not.toContain('open:Feishu');
  });

  test('falls back to deterministic smoke when the visual action loop fails', async () => {
    const runner: GuiRunner<void> = {
      async run() {
        throw new Error('model action loop timed out');
      }
    };
    const desktop = new FakeDesktop();
    const verifier: MessageVerifier = {
      async verify() {
        return {
          passed: false,
          reason: 'not reached'
        };
      }
    };
    const { logger, events } = createMemoryLogger();
    const fallbackMessages: string[] = [];

    const result = await runAiFirstImSmoke({
      groupName: 'CUA-Lark test group',
      messagePrefix: 'CUA-Lark test',
      runner,
      desktop,
      verifier,
      logger,
      now: () => new Date('2026-05-07T01:00:00.000Z'),
      fallbackRunner: async (message): Promise<ImSmokeRunResult> => {
        fallbackMessages.push(message);
        return {
          status: 'passed',
          message,
          reportPath: join(logger.runDir, 'report.md'),
          verification: {
            passed: true,
            reason: 'fallback message visible'
          }
        };
      }
    });

    expect(result.status).toBe('passed');
    expect(result.mode).toBe('fallback');
    expect(fallbackMessages).toEqual(['CUA-Lark test 2026-05-07T01:00:00.000Z']);
    expect(events.map((event) => event.type)).toContain('ai_im.fallback.started');
  });
});
