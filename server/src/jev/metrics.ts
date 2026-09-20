import type { Questions, SystemOneResult, Usage } from '@typesafe-ai/sdk';

type Price = { input: number; output: number };

const USD_PER_MILLION_TOKENS: { [model: string]: Price } = {
  'jev-1.13': { input: 0.042, output: 0 },
};

const MILLION = 1_000_000;

const PROCESSING_HEADER = 'x-envoy-upstream-service-time';

type Metered = Pick<SystemOneResult<Questions>, 'model' | 'usage'>;

export type Metrics = {
  model: string;
  durationMs: number;
  processingMs: number | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number | null;
};

function toProcessingMs(headers: Headers): number | null {
  const stated = headers.get(PROCESSING_HEADER);
  if (stated === null) {
    return null;
  }
  return Number(stated);
}

function toPrice(model: string): Price | null {
  const prices = Object.entries(USD_PER_MILLION_TOKENS);
  const match = prices.find(([name]) => model.startsWith(name));
  return match?.[1] ?? null;
}

function toCostUsd(model: string, usage: Usage): number | null {
  const price = toPrice(model);
  if (price === null) {
    return null;
  }
  const cost = usage.input_tokens * price.input + usage.output_tokens * price.output;
  return cost / MILLION;
}

export function toMetrics(result: Metered, headers: Headers, durationMs: number): Metrics {
  const processingMs = toProcessingMs(headers);
  const costUsd = toCostUsd(result.model, result.usage);
  return {
    model: result.model,
    durationMs,
    processingMs,
    inputTokens: result.usage.input_tokens,
    outputTokens: result.usage.output_tokens,
    costUsd,
  };
}

function toDuration(metrics: Metrics): string {
  const duration = Math.round(metrics.durationMs);
  if (metrics.processingMs === null) {
    return `${duration} ms for the round trip`;
  }
  const overhead = duration - metrics.processingMs;
  return (
    `${duration} ms for the round trip: ${metrics.processingMs} ms of processing at TypeSafe ` +
    `and ${overhead} ms for the network`
  );
}

function toCost(metrics: Metrics): string {
  if (metrics.costUsd === null) {
    return 'I know no price for this model.';
  }
  const cost = metrics.costUsd.toFixed(6);
  return `That costs about $${cost}.`;
}

export function toReport(metrics: Metrics): string {
  const duration = toDuration(metrics);
  const cost = toCost(metrics);
  return (
    `${metrics.model} took ${duration}. It used ${metrics.inputTokens} input tokens ` +
    `and ${metrics.outputTokens} output tokens. ${cost}`
  );
}
