import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DesktopController } from '../desktop/desktop-controller.js';
import type { RunLogger } from '../logging/run-logger.js';
import { renderMarkdownReport, type ReportStep } from '../reporter/markdown.js';
import { formatErrorMessage } from '../errors/format-error.js';
import type { MessageVerifier, MessageVerificationResult } from '../verifier/message-verifier.js';

export interface ImSmokeRunOptions {
  groupName: string;
  messagePrefix: string;
  openApp?: boolean;
  desktop: DesktopController;
  verifier: MessageVerifier;
  logger: RunLogger;
  now?: () => Date;
}

export interface ImSmokeRunResult {
  status: 'passed' | 'failed';
  message: string;
  reportPath: string;
  verification: MessageVerificationResult;
}

export async function runImSmoke(options: ImSmokeRunOptions): Promise<ImSmokeRunResult> {
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  const message = `${options.messagePrefix} ${startedAt.toISOString()}`;
  const steps: ReportStep[] = [];

  const log = (type: string, payload?: unknown) => {
    options.logger.write({
      type,
      timestamp: now().toISOString(),
      payload
    });
  };

  const recordStep = async (action: string, screenshotName: string) => {
    const screenshot = await options.desktop.screenshot(screenshotName);
    const step = {
      index: steps.length + 1,
      action,
      screenshotPath: screenshot.path
    };
    steps.push(step);
    log('im.step', step);
    return screenshot;
  };

  log('im.started', {
    groupName: options.groupName,
    message
  });

  let verification: MessageVerificationResult = {
    passed: false,
    reason: 'Verification did not run.'
  };
  let failureReason: string | undefined;

  try {
    if (options.openApp ?? true) {
      await options.desktop.openApp('飞书');
      await recordStep('Open Feishu desktop app', '01-open-feishu');
    }

    await options.desktop.openGlobalSearch();
    await options.desktop.pasteText(options.groupName);
    await options.desktop.wait(1200);
    await options.desktop.openFirstSearchResult();
    await options.desktop.wait(2500);
    await recordStep(`Search and open group: ${options.groupName}`, '02-open-group');

    await options.desktop.pasteText(message);
    await options.desktop.pressEnter();
    await options.desktop.wait(1500);
    const finalScreenshot = await recordStep(`Send message: ${message}`, '03-send-message');

    verification = await options.verifier.verify({
      message,
      screenshotBase64: finalScreenshot.base64
    });
    log('im.verification', verification);
  } catch (error) {
    failureReason = formatErrorMessage(error);
    log('im.failed', {
      error: failureReason
    });
  }

  const endedAt = now();
  const status = verification.passed && !failureReason ? 'passed' : 'failed';
  const report = renderMarkdownReport({
    caseId: 'im-send-message-001',
    product: 'im',
    status,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs: endedAt.getTime() - startedAt.getTime(),
    steps,
    failureReason: failureReason ?? (verification.passed ? undefined : verification.reason)
  });
  const reportPath = join(options.logger.runDir, 'report.md');
  writeFileSync(reportPath, report, 'utf8');

  log('im.finished', {
    status,
    message,
    reportPath,
    verification
  });

  return {
    status,
    message,
    reportPath,
    verification
  };
}
