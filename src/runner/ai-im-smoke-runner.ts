import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GuiRunner } from '../agent/lark-agent.js';
import type { DesktopController } from '../desktop/desktop-controller.js';
import { formatErrorMessage } from '../errors/format-error.js';
import type { RunLogger } from '../logging/run-logger.js';
import { renderMarkdownReport, type ReportStep } from '../reporter/markdown.js';
import type { MessageVerifier, MessageVerificationResult } from '../verifier/message-verifier.js';
import type { ImSmokeRunResult } from './im-smoke-runner.js';

export interface AiFirstImSmokeOptions {
  groupName: string;
  messagePrefix: string;
  openApp?: boolean;
  appName?: string;
  runner: GuiRunner<void>;
  desktop: DesktopController;
  verifier: MessageVerifier;
  logger: RunLogger;
  fallbackRunner?: (message: string) => Promise<ImSmokeRunResult>;
  now?: () => Date;
}

export interface AiFirstImSmokeResult {
  status: 'passed' | 'failed';
  mode: 'vision-loop' | 'fallback';
  message: string;
  instruction: string;
  reportPath: string;
  verification: MessageVerificationResult;
  aiError?: string;
}

export async function runAiFirstImSmoke(
  options: AiFirstImSmokeOptions
): Promise<AiFirstImSmokeResult> {
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const message = `${options.messagePrefix} ${startedAt.toISOString()}`;
  const instruction = buildAiImSmokeInstruction(options.groupName, message);
  const steps: ReportStep[] = [];

  const log = (type: string, payload?: unknown) => {
    options.logger.write({
      type,
      timestamp: now().toISOString(),
      payload
    });
  };

  log('ai_im.started', {
    groupName: options.groupName,
    message,
    instruction
  });

  try {
    if (options.openApp ?? true) {
      await options.desktop.openApp(options.appName ?? 'Feishu');
      log('ai_im.app.opened', {
        appName: options.appName ?? 'Feishu'
      });
    }

    await options.runner.run(instruction);
    log('ai_im.action_loop.finished');

    await options.desktop.wait(1200);
    const screenshot = await options.desktop.screenshot('ai-final-message');
    const step = {
      index: 1,
      action: 'Run UI-TARS visual action loop and capture final Feishu state',
      screenshotPath: screenshot.path
    };
    steps.push(step);
    log('ai_im.step', step);

    const verification = await options.verifier.verify({
      message,
      screenshotBase64: screenshot.base64
    });
    log('ai_im.verification', verification);

    if (!verification.passed && options.fallbackRunner) {
      return runFallback(options, message, instruction, verification.reason, log);
    }

    return finishAiRun({
      options,
      now,
      startedAt,
      message,
      instruction,
      steps,
      verification,
      failureReason: verification.passed ? undefined : verification.reason
    });
  } catch (error) {
    const aiError = formatErrorMessage(error);
    log('ai_im.action_loop.failed', {
      error: aiError
    });

    if (options.fallbackRunner) {
      return runFallback(options, message, instruction, aiError, log);
    }

    return finishAiRun({
      options,
      now,
      startedAt,
      message,
      instruction,
      steps,
      verification: {
        passed: false,
        reason: aiError
      },
      failureReason: aiError,
      aiError
    });
  }
}

export function buildAiImSmokeInstruction(groupName: string, message: string): string {
  return [
    '你正在操作 Windows 桌面上的飞书客户端。',
    `请通过视觉观察界面，搜索并打开群聊「${groupName}」。`,
    `在该群聊中发送这条完全一致的消息：「${message}」。`,
    '发送后请观察聊天窗口，确认这条消息已经出现在当前群聊中。',
    '优先根据屏幕内容决定下一步动作，不要依赖固定坐标。'
  ].join('\n');
}

async function runFallback(
  options: AiFirstImSmokeOptions,
  message: string,
  instruction: string,
  reason: string,
  log: (type: string, payload?: unknown) => void
): Promise<AiFirstImSmokeResult> {
  log('ai_im.fallback.started', {
    reason,
    message
  });
  const fallbackResult = await options.fallbackRunner?.(message);
  if (!fallbackResult) {
    throw new Error('Fallback runner is not configured.');
  }

  log('ai_im.fallback.finished', {
    status: fallbackResult.status,
    reportPath: fallbackResult.reportPath,
    verification: fallbackResult.verification
  });

  return {
    status: fallbackResult.status,
    mode: 'fallback',
    message: fallbackResult.message,
    instruction,
    reportPath: fallbackResult.reportPath,
    verification: fallbackResult.verification,
    aiError: reason
  };
}

function finishAiRun(input: {
  options: AiFirstImSmokeOptions;
  now: () => Date;
  startedAt: Date;
  message: string;
  instruction: string;
  steps: ReportStep[];
  verification: MessageVerificationResult;
  failureReason?: string;
  aiError?: string;
}): AiFirstImSmokeResult {
  const endedAt = input.now();
  const status = input.verification.passed && !input.failureReason ? 'passed' : 'failed';
  const reportPath = join(input.options.logger.runDir, 'report.md');
  const report = renderMarkdownReport({
    caseId: 'ai-im-send-message-001',
    product: 'im',
    status,
    startedAt: input.startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - input.startedAt.getTime(),
    steps: input.steps,
    failureReason: input.failureReason
  });
  writeFileSync(reportPath, report, 'utf8');

  input.options.logger.write({
    type: 'ai_im.finished',
    timestamp: input.now().toISOString(),
    payload: {
      status,
      mode: 'vision-loop',
      message: input.message,
      reportPath,
      verification: input.verification
    }
  });

  return {
    status,
    mode: 'vision-loop',
    message: input.message,
    instruction: input.instruction,
    reportPath,
    verification: input.verification,
    aiError: input.aiError
  };
}
