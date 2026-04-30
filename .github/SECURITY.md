# Security Policy

## Supported Versions

Security fixes are applied to the latest `main` branch.

## Reporting a Vulnerability

Please do not open a public issue for vulnerabilities.

Report security concerns privately to the repository owner or through GitHub private vulnerability reporting if it is enabled.

Include:

- A clear description of the issue
- Steps to reproduce
- Affected configuration or endpoint
- Impact assessment
- Suggested fix, if known

## Secrets

Never commit:

- `.env` files
- Flowise API keys
- Anthropic API keys
- OpenAI API keys
- Exported Flowise credentials

The NestJS API calls Flowise. LLM provider credentials should be stored in Flowise credentials, not in this repository.
