import type { GuiRunner } from '../agent/lark-agent.js';
import { formatErrorMessage } from '../errors/format-error.js';
import type { RunLogger } from '../logging/run-logger.js';

export interface InstructionRunOptions {
  instruction: string;
  runner: GuiRunner<void>;
  logger: RunLogger;
  now?: () => Date;
}

export interface InstructionRunResult {
  status: 'passed';
  runDir: string;
  eventsPath: string;
}

export async function runInstructionWithLogging(
  options: InstructionRunOptions
): Promise<InstructionRunResult> {
  const now = options.now ?? (() => new Date());
  const timestamp = () => now().toISOString();

  options.logger.write({
    type: 'run.started',
    timestamp: timestamp(),
    payload: {
      instruction: options.instruction
    }
  });

  try {
    await options.runner.run(options.instruction);
  } catch (error) {
    options.logger.write({
      type: 'run.failed',
      timestamp: timestamp(),
      payload: {
        instruction: options.instruction,
        error: formatErrorMessage(error)
      }
    });
    throw error;
  }

  options.logger.write({
    type: 'run.finished',
    timestamp: timestamp(),
    payload: {
      instruction: options.instruction
    }
  });

  return {
    status: 'passed',
    runDir: options.logger.runDir,
    eventsPath: options.logger.eventsPath
  };
}

