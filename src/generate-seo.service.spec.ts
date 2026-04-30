import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadInputError, EmptyLlmResponseError, FlowiseTimeoutError, InvalidJsonError } from './errors';
import { GenerateSeoService } from './generate-seo.service';
import { NormalizedGenerateSeoRequest, SeoStreamEvent } from './seo.types';

const ORIGINAL_ENV = { ...process.env };

describe('GenerateSeoService', () => {
  let service: GenerateSeoService;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      FLOWISE_BASE_URL: 'https://flowise.example',
      FLOWISE_CHATFLOW_ID: 'seo-flow',
      FLOWISE_API_KEY: 'flowise-token',
      FLOWISE_LLM_PROVIDER: 'claude',
      ANTHROPIC_MODEL: 'claude-3-5-sonnet-latest',
      OPENAI_MODEL: 'gpt-4o-mini',
    };
    service = new GenerateSeoService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it('normalizes valid input and uses Claude by default', () => {
    const result = service.normalizeRequest({
      product_name: '  Умная лампа  ',
      category: ' Освещение ',
      keywords: 'умная лампа, LED, E27',
    });

    expect(result).toEqual({
      productName: 'Умная лампа',
      category: 'Освещение',
      keywords: ['умная лампа', 'LED', 'E27'],
      provider: 'claude',
    });
  });

  it('rejects missing keywords', () => {
    expect(() =>
      service.normalizeRequest({
        product_name: 'Умная лампа',
        category: 'Освещение',
        keywords: ' , ',
      }),
    ).toThrow(BadInputError);
  });

  it('streams Flowise tokens and returns parsed SEO JSON', async () => {
    const seoJson = JSON.stringify({
      title: 'Умная LED-лампа Aurora E27',
      meta_description: 'Умная LED-лампа Aurora E27 для гибкого управления светом.',
      h1: 'Умная LED-лампа Aurora E27',
      description: 'Умная лампа помогает быстро настроить комфортный свет для дома.',
      bullets: ['Управление со смартфона', 'Подходит для патрона E27'],
    });

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(`data: ${JSON.stringify({ token: seoJson })}\n\n`, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const events = await collectEvents(service.streamSeo(validRequest()));

    expect(events).toEqual([
      { type: 'token', data: seoJson },
      {
        type: 'result',
        data: {
          title: 'Умная LED-лампа Aurora E27',
          meta_description: 'Умная LED-лампа Aurora E27 для гибкого управления светом.',
          h1: 'Умная LED-лампа Aurora E27',
          description: 'Умная лампа помогает быстро настроить комфортный свет для дома.',
          bullets: ['Управление со смартфона', 'Подходит для патрона E27'],
        },
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://flowise.example/api/v1/prediction/seo-flow',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
          Authorization: 'Bearer flowise-token',
        },
      }),
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      streaming: true,
      overrideConfig: {
        llm_provider: 'claude',
        modelName: 'claude-3-5-sonnet-latest',
        product_name: 'Умная LED-лампа Aurora E27',
        category: 'умное освещение',
        keywords: 'умная лампа, LED E27',
      },
    });
    expect(body.question).toContain('Верни только валидный JSON');
  });

  it('supports OpenAI provider override when requested', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          title: 'Title',
          meta_description: 'Meta',
          h1: 'H1',
          description: 'Description',
          bullets: ['Bullet'],
        }),
        { status: 200 },
      ),
    );

    await collectEvents(service.streamSeo({ ...validRequest(), provider: 'openai' }));

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));
    expect(body.overrideConfig).toMatchObject({
      llm_provider: 'openai',
      modelName: 'gpt-4o-mini',
    });
  });

  it('throws EmptyLlmResponseError when Flowise returns no content', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));

    await expect(collectEvents(service.streamSeo(validRequest()))).rejects.toThrow(
      EmptyLlmResponseError,
    );
  });

  it('throws InvalidJsonError when Flowise returns malformed JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json', { status: 200 }));

    await expect(collectEvents(service.streamSeo(validRequest()))).rejects.toThrow(
      InvalidJsonError,
    );
  });

  it('throws FlowiseTimeoutError when the request is aborted by timeout', async () => {
    process.env.FLOWISE_TIMEOUT_MS = '1';
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    await expect(collectEvents(service.streamSeo(validRequest()))).rejects.toThrow(
      FlowiseTimeoutError,
    );
  });
});

function validRequest(): NormalizedGenerateSeoRequest {
  return {
    productName: 'Умная LED-лампа Aurora E27',
    category: 'умное освещение',
    keywords: ['умная лампа', 'LED E27'],
    provider: 'claude',
  };
}

async function collectEvents(stream: AsyncGenerator<SeoStreamEvent>): Promise<SeoStreamEvent[]> {
  const events: SeoStreamEvent[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  return events;
}
