import { describe, expect, test } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runImSmoke } from '../../src/runner/im-smoke-runner.js';
import type { DesktopController, ScreenshotResult } from '../../src/desktop/desktop-controller.js';
import type { RunEvent, RunLogger } from '../../src/logging/run-logger.js';
import type { MessageVerifier } from '../../src/verifier/message-verifier.js';

class FakeDesktop implements DesktopController {
  actions: string[] = [];

  async openApp(appName: string): Promise<void> {
    this.actions.push(`open:${appName}`);
  }

  async openGlobalSearch(): Promise<void> {
    this.actions.push('hotkey:global-search');
  }

  async openFirstSearchResult(): Promise<void> {
    this.actions.push('open:first-search-result');
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
      path: `runs/demo/${name}.png`,
      base64: 'base64'
    };
  }
}

function createMemoryLogger(): { logger: RunLogger; events: RunEvent[] } {
  const events: RunEvent[] = [];
  const runDir = mkdtempSync(join(tmpdir(), 'cua-lark-im-smoke-'));
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

describe('runImSmoke', () => {
  test('searches a group, sends a unique message, verifies it, and writes a report', async () => {
    const desktop = new FakeDesktop();
    const verifier: MessageVerifier = {
      async verify(input) {
        return {
          passed: input.message.includes('2026-05-07T01:00:00.000Z'),
          reason: 'message visible'
        };
      }
    };
    const { logger, events } = createMemoryLogger();

    const result = await runImSmoke({
      groupName: 'CUA-Lark测试群',
      messagePrefix: 'CUA-Lark test',
      desktop,
      verifier,
      logger,
      now: () => new Date('2026-05-07T01:00:00.000Z')
    });

    expect(result.status).toBe('passed');
    expect(result.message).toBe('CUA-Lark test 2026-05-07T01:00:00.000Z');
    expect(desktop.actions).toContain('paste:CUA-Lark测试群');
    expect(desktop.actions).toContain('open:first-search-result');
    expect(desktop.actions).toContain('paste:CUA-Lark test 2026-05-07T01:00:00.000Z');
    expect(events.map((event) => event.type)).toContain('im.verification');
  });

  test('can start from an already focused Feishu window', async () => {
    const desktop = new FakeDesktop();
    const verifier: MessageVerifier = {
      async verify() {
        return { passed: true, reason: 'message visible' };
      }
    };
    const { logger } = createMemoryLogger();

    await runImSmoke({
      groupName: 'CUA-Lark测试群',
      messagePrefix: 'CUA-Lark test',
      openApp: false,
      desktop,
      verifier,
      logger,
      now: () => new Date('2026-05-07T01:00:00.000Z')
    });

    expect(desktop.actions).not.toContain('open:飞书');
    expect(desktop.actions[0]).toBe('hotkey:global-search');
  });
});
