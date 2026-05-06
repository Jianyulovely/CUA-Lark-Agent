import { describe, expect, test } from 'vitest';
import { renderMarkdownReport } from '../../src/reporter/markdown.js';

describe('renderMarkdownReport', () => {
  test('renders case result and screenshot paths', () => {
    const markdown = renderMarkdownReport({
      caseId: 'im-send-message-001',
      product: 'im',
      status: 'passed',
      startedAt: '2026-05-06T00:00:00.000Z',
      endedAt: '2026-05-06T00:00:03.000Z',
      durationMs: 3000,
      steps: [
        {
          index: 1,
          action: 'type(content="hello")',
          screenshotPath: 'reports/run-1/step-1.png'
        }
      ]
    });

    expect(markdown).toContain('# Test Report: im-send-message-001');
    expect(markdown).toContain('passed');
    expect(markdown).toContain('reports/run-1/step-1.png');
  });
});

