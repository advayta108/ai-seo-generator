export type LlmProvider = 'claude' | 'openai';

export interface GenerateSeoRequest {
  product_name: string;
  category: string;
  keywords: string | string[];
  llm_provider?: LlmProvider;
}

export interface NormalizedGenerateSeoRequest {
  productName: string;
  category: string;
  keywords: string[];
  provider: LlmProvider;
}

export interface SeoOutput {
  title: string;
  meta_description: string;
  h1: string;
  description: string;
  bullets: string[];
}

export type SeoStreamEvent =
  | { type: 'token'; data: string }
  | { type: 'result'; data: SeoOutput }
  | { type: 'error'; data: { code: string; message: string } };

export interface FlowisePredictionRequest {
  question: string;
  streaming: true;
  overrideConfig: Record<string, unknown>;
}
