'use client';

import type { Location, MetricKey, RadiusKey, Weights } from '@/lib/types';
import { METRIC_LABEL, METRIC_ICON, colorByScore } from '@/lib/constants';
import { weightedScore } from '@/lib/scoring';

type Props = { location: Location; radius: RadiusKey; weights: Weights };

export default function ScoreCard({ location, radius, weights }: Props) {
  const metrics = location.scores[radius];
  const overall = weightedScore(metrics, weights);
  const keys = (Object.keys(metrics) as MetricKey[]).filter(k => (weights[k] ?? 0) > 0);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      {/* 헤더 */}
      <div className="text-center">
        <div className="text-sm text-slate-500">선택 지역</div>
        <div className="text-xl font-semibold mt-1">{location.name}</div>
        <div className="text-slate-500 text-sm">{location.address}</div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm">
          반경 {radius}
        </div>

        {/* 종합 점수: 점수 구간별 색상 */}
        <div className="mt-6 text-6xl font-bold" style={{ color: colorByScore(overall) }}>
          {overall}
        </div>
        <div className="text-slate-500">종합 생활 점수</div>
      </div>

      {/* 상세 분석 */}
      <div className="mt-8">
        <div className="text-sm font-medium mb-3">반경별 상세 분석</div>
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-base leading-none">{METRIC_ICON[k]}</span>
                  <span>{METRIC_LABEL[k]}</span>
                  <span className="ml-2 text-xs text-slate-400">가중치 {weights[k]}%</span>
                </div>
                {/* 각 항목 점수 색상도 범례 기준으로 */}
                <div className="font-medium" style={{ color: colorByScore(metrics[k]) }}>
                  {metrics[k]}점
                </div>
              </div>

              <div className="mt-1 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${metrics[k]}%`,
                    background: colorByScore(metrics[k]),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
