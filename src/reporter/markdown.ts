export interface ReportStep {
  index: number;
  action: string;
  screenshotPath?: string;
}

export interface ReportInput {
  caseId: string;
  product: string;
  status: 'passed' | 'failed';
  startedAt: string;
  endedAt: string;
  durationMs: number;
  steps: ReportStep[];
  failureReason?: string;
}

export function renderMarkdownReport(input: ReportInput): string {
  const lines = [
    `# Test Report: ${input.caseId}`,
    '',
    `- Product: ${input.product}`,
    `- Status: ${input.status}`,
    `- Started At: ${input.startedAt}`,
    `- Ended At: ${input.endedAt}`,
    `- Duration: ${input.durationMs} ms`
  ];

  if (input.failureReason) {
    lines.push(`- Failure Reason: ${input.failureReason}`);
  }

  lines.push('', '## Steps', '');

  for (const step of input.steps) {
    lines.push(`### Step ${step.index}`, '', `Action: \`${step.action}\``);
    if (step.screenshotPath) {
      lines.push('', `Screenshot: \`${step.screenshotPath}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

