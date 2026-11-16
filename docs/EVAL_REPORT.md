# Infiniti Code Tech — AI Evaluation Report (Day 1)

- **Date**: 2026-11-16T07:04:27.001Z
- **Target Model**: `qwen2.5:7b-instruct`
- **Fallback Models**: `llama3.1:8b`, `llama3.2:3b`
- **Status**: Ollama server offline during CLI run; schema and prompt validated via Vitest contract tests.
- **Fixture Count**: 10

### Threshold Verification Requirements
| Metric | Target | Offline Status |
|---|---|---|
| Valid JSON Schema | >= 90% | Enforced by Zod & JSON Schema format |
| Category Accuracy | >= 80% | Configured with category prompt hints |
| Verbatim Quote in Source | >= 90% | Enforced by `verify.ts` quotation matcher |

*Run `npm run ai:eval` with `ollama serve` active to generate live model inference statistics.*
