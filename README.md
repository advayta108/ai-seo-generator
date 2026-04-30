# 🚀 AI SEO Generator

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Flowise](https://img.shields.io/badge/Flowise-Prediction_API-00B8A9?style=for-the-badge)](https://flowiseai.com/)
[![Claude](https://img.shields.io/badge/Claude_API-Supported-D97757?style=for-the-badge)](https://www.anthropic.com/api)
[![CI](https://img.shields.io/github/actions/workflow/status/advayta108/ai-seo-generator/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/advayta108/ai-seo-generator/actions/workflows/ci.yml)

NestJS endpoint for generating product SEO descriptions through Flowise.

## ✨ What is included

- `POST /api/generate-seo` accepts product data and streams Server-Sent Events.
- Flowise Prediction API integration with timeout handling.
- Structured JSON validation for `{ title, meta_description, h1, description, bullets }`.
- LLM provider override support for `claude` and `openai`; Claude is the default provider.
- Flowise setup notes and a chatflow blueprint in `flowise/seo-description-chatflow.json`.

## 📦 Install

```bash
npm install
cp .env.example .env
```

Set these required variables in `.env`:

```bash
FLOWISE_BASE_URL=http://localhost:3001
FLOWISE_CHATFLOW_ID=<your-flowise-chatflow-id>
FLOWISE_LLM_PROVIDER=claude
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

If Flowise is protected with an API key, also set `FLOWISE_API_KEY`.

## 🏗️ Build

```bash
npm run typecheck
npm run build
```

The compiled application is written to `dist`.

## ▶️ Run

Development mode with restart on file changes:

```bash
npm run dev
```

Production mode after build:

```bash
npm run build
npm start
```

By default the API listens on `http://localhost:3000`. Override it with `PORT`.

## 🧪 Test

Run the Vitest test suite once:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

The tests mock Flowise and cover request normalization, Claude/OpenAI provider overrides, streamed JSON parsing, empty LLM responses, invalid JSON, and timeout handling.

## 📡 Request

```bash
curl -N -X POST http://localhost:3000/api/generate-seo \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Умная LED-лампа Aurora E27",
    "category": "умное освещение",
    "keywords": ["умная лампа", "LED E27", "управление со смартфона"],
    "llm_provider": "claude"
  }'
```

## 🌊 Stream Events

The endpoint returns `text/event-stream`:

- `token`: raw model text as Flowise streams it.
- `result`: parsed and validated SEO JSON.
- `error`: timeout, empty LLM response, invalid JSON, or Flowise upstream error.

Example final event:

```text
event: result
data: {"title":"...","meta_description":"...","h1":"...","description":"...","bullets":["..."]}
```

## 🔗 Flowise

Create a chatflow with:

- Prompt Template variables: `{product_name}`, `{category}`, `{keywords}`.
- Claude Chat Model node, for example `claude-3-5-sonnet-latest`.
- Structured Output Parser with the SEO JSON schema.
- LLM Chain connected to the parser.

The API sends the full prompt in `question` and also forwards variables in `overrideConfig` for chatflows that read prompt variables directly.
