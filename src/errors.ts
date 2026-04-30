export class BadInputError extends Error {
  public readonly code = 'BAD_INPUT';
}

export class FlowiseTimeoutError extends Error {
  public readonly code = 'FLOWISE_TIMEOUT';
}

export class EmptyLlmResponseError extends Error {
  public readonly code = 'EMPTY_LLM_RESPONSE';
}

export class InvalidJsonError extends Error {
  public readonly code = 'INVALID_JSON';
}

export class FlowiseUpstreamError extends Error {
  public readonly code = 'FLOWISE_UPSTREAM_ERROR';

  public constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}
