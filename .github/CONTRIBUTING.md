# Contributing to AI SEO Generator

Thank you for your interest in improving AI SEO Generator.

## Development Setup

```bash
git clone https://github.com/advayta108/ai-seo-generator.git
cd ai-seo-generator
npm install
cp .env.example .env
```

Configure Flowise in `.env` if you want to run the API against a real chatflow.

## Useful Commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
```

## Code Standards

- Use TypeScript with strict typing.
- Keep provider-specific logic isolated behind the Flowise integration.
- Preserve the streaming API contract: `token`, `result`, and `error` SSE events.
- Add or update Vitest tests for validation, parsing, provider overrides, and error handling changes.
- Do not commit `.env`, credentials, Flowise API keys, Anthropic keys, OpenAI keys, or generated `dist` output.

## Pull Requests

Before opening a pull request:

1. Run `npm run typecheck`.
2. Run `npm test`.
3. Run `npm run build`.
4. Update `README.md` or `docs/` if behavior or configuration changes.

## Commit Style

Use short, descriptive commit messages. Conventional commits are welcome:

```text
feat: add provider override tests
fix: handle empty Flowise responses
docs: document Claude setup
```

## Reporting Issues

Please include:

- Node.js version
- Operating system
- Flowise version and chatflow shape
- Request payload, with secrets removed
- Expected and actual SSE events
