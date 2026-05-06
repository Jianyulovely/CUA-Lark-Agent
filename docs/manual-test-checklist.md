# Manual Test Checklist

- Feishu desktop is open and logged in.
- Only one display is active.
- The test group exists and is searchable.
- `.env` contains local model credentials.
- `npm run model:vision-smoke` passed against the configured endpoint.
- AI-first demo command: `npm run dev -- --run-ai-im-smoke --max-loop-count 8`.
- Use `--skip-open-app` only when Feishu is already the foreground window.
- Fallback-only demo command: `npm run dev -- --run-im-smoke --skip-open-app`.
- No real API key is committed.
