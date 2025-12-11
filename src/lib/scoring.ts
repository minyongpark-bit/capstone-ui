import type { ScoresByMetric, Weights } from './types';
import { METRIC_KEYS } from './constants';

export function weightedScore(metrics: ScoresByMetric, weights: Weights): number {
  let total = 0;
  let wsum = 0;

  for (const k of METRIC_KEYS) {
    const w = weights[k] ?? 0;
    const v = metrics[k] ?? 0;   // 없으면 0으로
    if (w > 0) {
      total += v * w;
      wsum  += w;
    }
  }
  return wsum ? Math.round(total / wsum) : 0;
}
