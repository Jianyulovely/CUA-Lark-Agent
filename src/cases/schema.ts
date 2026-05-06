import { z } from 'zod';

export const TestCaseSchema = z.object({
  id: z.string().min(1),
  product: z.enum(['im', 'docs', 'calendar']),
  instruction: z.string().min(1),
  expected: z.string().min(1)
});

export type TestCase = z.infer<typeof TestCaseSchema>;

export function parseTestCase(input: unknown): TestCase {
  return TestCaseSchema.parse(input);
}

