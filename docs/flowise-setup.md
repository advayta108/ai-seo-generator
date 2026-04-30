# Flowise Setup

## Chatflow Shape

Use these nodes:

1. Prompt Template
2. ChatAnthropic or ChatOpenAI
3. Structured Output Parser
4. LLM Chain

## Prompt Template

```text
Ты SEO-копирайтер для карточек товаров.
Верни только валидный JSON без markdown и пояснений.

Данные:
- Название товара: {product_name}
- Категория: {category}
- Ключевые слова: {keywords}

JSON-схема:
{
  "title": "string, до 60 символов",
  "meta_description": "string, до 160 символов",
  "h1": "string",
  "description": "string, 500-900 символов",
  "bullets": ["4-6 коротких преимуществ"]
}

Правила:
- Не выдумывай технические характеристики.
- Используй ключевые слова естественно.
- Не добавляй markdown, комментарии или текст вне JSON.
```

## Structured Output Parser Schema

```json
{
  "title": "SEO title up to 60 characters",
  "meta_description": "Meta description up to 160 characters",
  "h1": "Readable product H1",
  "description": "Product description, 500-900 characters",
  "bullets": ["Product benefit bullet"]
}
```

## Why These Parameters

- `temperature: 0.35`: enough variation for marketing text, but low enough to keep schema adherence stable.
- `maxTokens: 900`: enough for a 500-900 character description plus title, meta, H1, and bullets.
- Structured parser: catches malformed model output before the API emits the final `result` event.
- No document chunking is used because the task has a small structured input, not a retrieval corpus.

## Claude Support

For Claude, use the Flowise Anthropic chat model node and store the Anthropic key in Flowise credentials. The NestJS API forwards:

```json
{
  "llm_provider": "claude",
  "modelName": "claude-3-5-sonnet-latest",
  "temperature": 0.35,
  "maxTokens": 900
}
```

If the chatflow needs node-scoped overrides, set `FLOWISE_LLM_NODE_ID` to the Flowise node id, for example `chatAnthropic_0`.
