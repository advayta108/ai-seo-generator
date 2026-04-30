# AI SEO Generator Context

## Project

Repository: `https://github.com/advayta108/ai-seo-generator`

Task: implement a product SEO description generator in TypeScript/NestJS.

## Core Requirements

- Flowise chatflow uses prompt variables `{product_name}`, `{category}`, `{keywords}`.
- Flowise chain should use a structured output parser.
- Expected JSON output: `{ title, meta_description, h1, description, bullets }`.
- NestJS endpoint: `POST /api/generate-seo`.
- Endpoint calls Flowise Prediction API and returns Server-Sent Events.
- Handle timeout, empty LLM response, and invalid JSON.
- Support Claude API through Flowise provider overrides, not only OpenAI-format models.

## Current Implementation

- `src/generate-seo.controller.ts` exposes `POST /api/generate-seo`.
- `src/generate-seo.service.ts` normalizes input, builds the SEO prompt, calls Flowise, streams tokens, and validates the final JSON.
- Supported providers: `claude`, `openai`.
- Claude is the default provider.
- `FLOWISE_API_KEY` is for Flowise Prediction API access.
- Anthropic/OpenAI provider keys are expected to be configured in Flowise credentials.

## Verification

Use:

```bash
npm run typecheck
npm test
npm run build
```

Current test suite uses Vitest and mocks Flowise responses.

## GitHub Setup

- Git branch: `main`.
- Remote: `origin https://github.com/advayta108/ai-seo-generator`.
- CI: `.github/workflows/ci.yml`.
- Dependabot: `.github/dependabot.yml`.
- Dependabot auto-merge: `.github/workflows/dependabot-auto-merge.yml`.
- Community files are under `.github/`.
