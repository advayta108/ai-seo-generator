import {
  BadInputError,
  EmptyLlmResponseError,
  FlowiseTimeoutError,
  FlowiseUpstreamError,
  InvalidJsonError,
} from './errors';
import {
  FlowisePredictionRequest,
  GenerateSeoRequest,
  LlmProvider,
  NormalizedGenerateSeoRequest,
  SeoOutput,
  SeoStreamEvent,
} from './seo.types';

type JsonRecord = Record<string, unknown>;

export class GenerateSeoService {
  public normalizeRequest(input: unknown): NormalizedGenerateSeoRequest {
    if (!isRecord(input)) {
      throw new BadInputError('Request body must be a JSON object.');
    }

    const productName = normalizeRequiredText(input.product_name, 'product_name');
    const category = normalizeRequiredText(input.category, 'category');
    const keywords = normalizeKeywords(input.keywords);
    const provider = normalizeProvider(input.llm_provider, this.defaultProvider());

    return {
      productName,
      category,
      keywords,
      provider,
    };
  }

  public async *streamSeo(request: NormalizedGenerateSeoRequest): AsyncGenerator<SeoStreamEvent> {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.FLOWISE_TIMEOUT_MS ?? 30_000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.predictionUrl(), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(this.toFlowisePayload(request)),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new FlowiseUpstreamError(
          `Flowise returned HTTP ${response.status}${body ? `: ${body}` : ''}`,
          response.status,
        );
      }

      let answer = '';
      for await (const token of this.readFlowiseStream(response)) {
        answer += token;
        yield { type: 'token', data: token };
      }

      if (!answer.trim()) {
        throw new EmptyLlmResponseError('LLM returned an empty response.');
      }

      yield { type: 'result', data: parseSeoOutput(answer) };
    } catch (error) {
      if (isAbortError(error)) {
        throw new FlowiseTimeoutError(`Flowise request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async *readFlowiseStream(response: Response): AsyncGenerator<string> {
    if (!response.body) {
      yield await response.text();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      const rawChunk = decoder.decode(value, { stream: true });
      const token = extractFlowiseText(rawChunk);
      if (token) {
        yield token;
      }
    }

    const rest = decoder.decode();
    if (rest) {
      const token = extractFlowiseText(rest);
      if (token) {
        yield token;
      }
    }
  }

  private predictionUrl(): string {
    const baseUrl = process.env.FLOWISE_BASE_URL?.replace(/\/+$/, '');
    const chatflowId = process.env.FLOWISE_CHATFLOW_ID;

    if (!baseUrl || !chatflowId) {
      throw new FlowiseUpstreamError(
        'FLOWISE_BASE_URL and FLOWISE_CHATFLOW_ID must be configured.',
      );
    }

    return `${baseUrl}/api/v1/prediction/${encodeURIComponent(chatflowId)}`;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json',
    };

    if (process.env.FLOWISE_API_KEY) {
      headers.Authorization = `Bearer ${process.env.FLOWISE_API_KEY}`;
    }

    return headers;
  }

  private toFlowisePayload(request: NormalizedGenerateSeoRequest): FlowisePredictionRequest {
    return {
      question: buildSeoPrompt(request),
      streaming: true,
      overrideConfig: this.providerOverrideConfig(request),
    };
  }

  private providerOverrideConfig(request: NormalizedGenerateSeoRequest): Record<string, unknown> {
    const modelName =
      request.provider === 'claude'
        ? process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest'
        : process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

    const common = {
      product_name: request.productName,
      category: request.category,
      keywords: request.keywords.join(', '),
      llm_provider: request.provider,
      modelName,
      temperature: 0.35,
      maxTokens: 900,
    };

    const llmNodeId = process.env.FLOWISE_LLM_NODE_ID;
    if (!llmNodeId) {
      return common;
    }

    return {
      ...common,
      [llmNodeId]: {
        provider: request.provider,
        modelName,
        temperature: common.temperature,
        maxTokens: common.maxTokens,
      },
    };
  }

  private defaultProvider(): LlmProvider {
    return normalizeProvider(process.env.FLOWISE_LLM_PROVIDER, 'claude');
  }
}

function buildSeoPrompt(request: NormalizedGenerateSeoRequest): string {
  return [
    'Ты SEO-копирайтер для карточек товаров.',
    'Верни только валидный JSON без markdown и пояснений.',
    'JSON-схема: {"title": string, "meta_description": string, "h1": string, "description": string, "bullets": string[]}.',
    'Ограничения: title до 60 символов, meta_description до 160 символов, h1 естественный и без переспама, description 500-900 символов, bullets 4-6 пунктов.',
    `Название товара: ${request.productName}`,
    `Категория: ${request.category}`,
    `Ключевые слова: ${request.keywords.join(', ')}`,
  ].join('\n');
}

function normalizeRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new BadInputError(`${field} must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new BadInputError(`${field} must not be empty.`);
  }

  if (normalized.length > 300) {
    throw new BadInputError(`${field} is too long.`);
  }

  return normalized;
}

function normalizeKeywords(value: unknown): string[] {
  if (typeof value === 'string') {
    const keywords = value
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .slice(0, 20);

    if (keywords.length === 0) {
      throw new BadInputError('keywords must contain at least one keyword.');
    }

    return keywords;
  }

  if (Array.isArray(value)) {
    const keywords = value
      .map((keyword) => (typeof keyword === 'string' ? keyword.trim() : ''))
      .filter(Boolean)
      .slice(0, 20);

    if (keywords.length === 0) {
      throw new BadInputError('keywords must contain at least one keyword.');
    }

    return keywords;
  }

  throw new BadInputError('keywords must be a string or an array of strings.');
}

function normalizeProvider(value: unknown, fallback: LlmProvider): LlmProvider {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (value === 'claude' || value === 'openai') {
    return value;
  }

  throw new BadInputError('llm_provider must be either "claude" or "openai".');
}

function extractFlowiseText(chunk: string): string {
  const lines = chunk.split(/\r?\n/);
  const dataLines = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim())
    .filter((line) => line && line !== '[DONE]');

  if (dataLines.length === 0) {
    return chunk;
  }

  return dataLines.map(extractDataLineText).join('');
}

function extractDataLineText(line: string): string {
  try {
    return extractKnownText(JSON.parse(line)) ?? line;
  } catch {
    return line;
  }
}

function parseSeoOutput(raw: string): SeoOutput {
  const parsed = parseJson(raw);
  const output = coerceSeoOutput(parsed);

  if (output) {
    return output;
  }

  const nestedText = extractKnownText(parsed);
  if (nestedText) {
    const nestedOutput = coerceSeoOutput(parseJson(nestedText));
    if (nestedOutput) {
      return nestedOutput;
    }
  }

  throw new InvalidJsonError('LLM response does not match SEO JSON schema.');
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');

    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // Fall through to a domain error below.
      }
    }
  }

  throw new InvalidJsonError('LLM response is not valid JSON.');
}

function coerceSeoOutput(value: unknown): SeoOutput | null {
  if (!isRecord(value)) {
    return null;
  }

  const bullets = value.bullets;
  if (
    typeof value.title !== 'string' ||
    typeof value.meta_description !== 'string' ||
    typeof value.h1 !== 'string' ||
    typeof value.description !== 'string' ||
    !Array.isArray(bullets) ||
    bullets.some((bullet) => typeof bullet !== 'string')
  ) {
    return null;
  }

  const output = {
    title: value.title.trim(),
    meta_description: value.meta_description.trim(),
    h1: value.h1.trim(),
    description: value.description.trim(),
    bullets: bullets.map((bullet) => bullet.trim()).filter(Boolean),
  };

  if (
    !output.title ||
    !output.meta_description ||
    !output.h1 ||
    !output.description ||
    output.bullets.length === 0
  ) {
    return null;
  }

  return output;
}

function extractKnownText(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of ['token', 'text', 'answer', 'content', 'data']) {
    const field = value[key];
    if (typeof field === 'string') {
      return field;
    }
  }

  return null;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
