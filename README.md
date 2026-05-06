# CUA-Lark-Agent

CUA-Lark-Agent is a competition project for building a Computer-Use Agent testing framework for the Feishu/Lark desktop client.

The project uses UI-TARS as the GUI agent execution foundation and focuses on Feishu-specific automated testing:

- natural-language or structured test case input
- visual desktop operation through UI-TARS
- per-step screenshots and action logs
- post-action state verification
- Markdown/HTML test reports

## MVP Scope

The first milestone is an IM end-to-end smoke test:

1. Search a dedicated Feishu test group.
2. Send a unique message.
3. Verify the message appears in the conversation.
4. Generate a report with screenshots, timing, and pass/fail result.

## Configuration

Copy `.env.example` to `.env` locally and fill in model credentials. Do not commit `.env`.

For Volcengine Ark / Doubao endpoint resources, the expected OpenAI-compatible shape is:

```text
CUA_LARK_MODEL_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
CUA_LARK_MODEL=<endpoint-id-or-model-id>
CUA_LARK_MODEL_API_KEY=<api-key>
```

Before using the endpoint for UI-TARS, run a vision smoke test to confirm the endpoint supports image input.

```bash
npm run model:vision-smoke
```

Expected result:

```text
Vision smoke test passed.
Model response: ...
```

If the endpoint rejects image input, this command fails before we wire the model into UI-TARS desktop execution.

## Current Status

Repository initialization is in progress. See:

- `docs/MVP-technical-plan.md`
- `docs/superpowers/plans/2026-05-06-cua-lark-mvp.md`
