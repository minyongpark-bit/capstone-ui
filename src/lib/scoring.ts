import type { MetricKey, ScoresByMetric, Weights } from './types';


export function weightedScore(metrics: ScoresByMetric, weights: Weights): number {
    const wsum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
    const total = (Object.keys(metrics) as MetricKey[]).reduce((s, k) => s + metrics[k] * weights[k], 0);
    return Math.round(total / wsum);
}