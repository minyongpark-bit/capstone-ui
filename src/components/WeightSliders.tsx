import type { MetricKey, Weights } from '@/lib/types';
import { METRIC_LABEL, METRIC_ICON } from '@/lib/constants';

type Props = { weights: Weights; setWeights: (w: Weights) => void };

export default function WeightSliders({ weights, setWeights }: Props) {
  const total = (Object.values(weights) as number[]).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="font-semibold mb-4">가중치 설정</div>

      {(Object.keys(weights) as MetricKey[]).map((k) => (
        <div key={k} className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{METRIC_ICON[k]}</span>
              <span>{METRIC_LABEL[k]}</span>
            </div>
            <div className="text-sm text-slate-500">{weights[k]}%</div>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={weights[k]}
            onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
            className="w-full accent-slate-900"
          />
        </div>
      ))}

      <div className={`text-sm ${total === 100 ? 'text-slate-500' : 'text-rose-600 font-medium'}`}>
        총 가중치 {total}% {total !== 100 && '(100%이 되도록 조정하세요)'}
      </div>
    </div>
  );
}