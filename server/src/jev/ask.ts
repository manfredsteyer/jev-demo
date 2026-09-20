import type { EntryType, Questions, SystemOneResult, TypeSafeClient } from '@typesafe-ai/sdk';
import { SHOW_JEV_RESULT } from '../feature-flags.ts';
import { toMetrics, type Metrics } from './metrics.ts';

export type Asked<Q extends Questions> = {
  answers: SystemOneResult<Q>['answers'];
  metrics: Metrics;
};

export async function ask<const Q extends Questions>(
  client: TypeSafeClient,
  state: EntryType,
  questions: Q,
): Promise<Asked<Q>> {
  const started = performance.now();
  const { data, response } = await client.systemOne({ state, questions }).withResponse();
  const durationMs = performance.now() - started;

  const metrics = toMetrics(data, response.headers, durationMs);

  if (SHOW_JEV_RESULT) {
    const json = JSON.stringify({ result: data, metrics }, null, 2);
    console.log('Result from Jev: \n' + json + '\n');
  }

  return { answers: data.answers, metrics };
}
