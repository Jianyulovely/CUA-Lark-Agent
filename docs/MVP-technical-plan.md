# CUA-Lark MVP Technical Plan

## Goal

Build a minimal, reliable Feishu desktop testing agent on top of `@ui-tars/sdk`, proving one complete testing loop before expanding product coverage.

## Key Constraints

- The project is a new repository that depends on UI-TARS SDK instead of deeply modifying `UI-TARS-desktop`.
- Real API keys stay only in local `.env` files and are never committed.
- The first milestone runs on a single-display Windows laptop with Feishu desktop already logged in.
- The first product surface is Feishu IM because it is easy to demonstrate and verify.
- The model endpoint must support image input because UI-TARS depends on screenshot-based visual reasoning.

## Model Configuration

The runtime will read an OpenAI-compatible model configuration from environment variables:

```text
CUA_LARK_MODEL_BASE_URL
CUA_LARK_MODEL
CUA_LARK_MODEL_API_KEY
```

For Volcengine Ark, the expected base URL is:

```text
https://ark.cn-beijing.volces.com/api/v3
```

The shared `ep-...` value should be treated as the endpoint/model identifier in local configuration. Before full UI-TARS execution, we must run a small multimodal request with a screenshot or test image to verify that this endpoint accepts image input.

## MVP Architecture

```text
CLI
  -> Case Loader
  -> Lark Agent
       -> UI-TARS GUIAgent
       -> NutJS Operator
  -> Verifier
  -> Reporter
```

### Case Loader

Reads a JSON test case and validates the required fields: `id`, `product`, `instruction`, and `expected`.

### Lark Agent

Wraps `GUIAgent` from `@ui-tars/sdk` so the rest of the project uses a stable local API:

```ts
runCase(testCase): Promise<RunResult>
```

### Verifier

For the first milestone, verification checks whether the expected message text appears after execution. The initial implementation can use model-based visual verification; OCR can be added later if needed.

### Reporter

Generates a Markdown report containing:

- case metadata
- start/end time
- elapsed duration
- per-step action summaries
- screenshot paths
- pass/fail result
- failure reason

## First Test Case

```json
{
  "id": "im-send-message-001",
  "product": "im",
  "instruction": "在飞书中搜索指定测试群，发送一条唯一测试消息，并确认发送成功",
  "expected": "会话中出现唯一测试消息"
}
```

The actual message should include a timestamp suffix so repeated test runs are distinguishable.

## Risks

- The provided Doubao/Ark endpoint may be text-only. Mitigation: run a vision smoke test before using it as the UI-TARS model.
- Feishu UI can be affected by popups, loading state, account permissions, and window focus. Mitigation: keep the first test case short and record screenshots at every step.
- UI-TARS coordinate prediction can be unstable on scaled displays. Mitigation: use a single display, fixed Feishu window size, and saved screenshots for diagnosis.
- Real-world GUI tests are slower and less deterministic than unit tests. Mitigation: keep core parsing, validation, and reporting logic unit-tested separately from desktop execution.

## Near-Term Milestones

1. Initialize the TypeScript project and test framework.
2. Add environment configuration loading with secret-safe defaults.
3. Add case schema validation and one IM sample case.
4. Add report generation.
5. Add a model vision smoke test.
6. Add the UI-TARS runner wrapper.
7. Run the first IM desktop test manually on the prepared Feishu account.

