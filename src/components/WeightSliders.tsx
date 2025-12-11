'use client';
import React from 'react';
import type { Weights, SubWeights, MetricKey } from '@/lib/types';
import { METRIC_LABEL, METRIC_ICON, METRIC_KEYS, SUB_LABELS, SUB_KEYS } from '@/lib/constants';

/** 하위가 있는 부모들만 정확한 튜플로 명시 */
const PARENTS_WITH_CHILDREN = [
  'food', 'transport', 'education', 'amenities', 'medical', 'delivery',
] as const;
type ParentWithChildren = typeof PARENTS_WITH_CHILDREN[number];

type Props = {
  weights: Weights;
  setWeights: React.Dispatch<React.SetStateAction<Weights>>;
  subWeights: SubWeights;
  setSubWeights: React.Dispatch<React.SetStateAction<SubWeights>>;
  activeKeys?: MetricKey[];
  syncChildrenOnParent?: boolean;
  expandedKey?: MetricKey | null;
  onToggle?: (k: MetricKey) => void;
};

/** 합계를 구함 */
const sum = (o: Record<string, number>) => Object.values(o).reduce((a,b)=>a+b,0) || 1;

function scaleToTotal<T extends Record<string, number>>(obj: T, total: number): T {
  const entries = Object.entries(obj);
  const cur = Math.max(1, entries.reduce((s,[,v])=>s+v,0)); // 0 나눗셈 방지
  const raw = entries.map(([k,v]) => [k, (v * total) / cur] as const);

  // 바닥 내림 후 남은 잔여값을 소수점 큰 항목부터 +1씩 분배
  const floored = raw.map(([k,v]) => [k, Math.floor(v)] as const);
  let remainder = total - floored.reduce((s,[,v])=>s+v,0);

  const order = raw
    .map(([k,v]) => ({ k, frac: v - Math.floor(v) }))
    .sort((a,b) => b.frac - a.frac);

  const out: Record<string, number> = Object.fromEntries(floored);
  for (let i=0; i<order.length && remainder>0; i++) {
    out[order[i].k] += 1;
    remainder--;
  }
  return out as T;
}

/** obj를 total에 맞춰 스케일. 마지막 키에 잔여를 몰아 반올림 오차 제거 */
function normalizeToTotal<T extends string>(
  obj: Record<T, number>,
  total: number,
): Record<T, number> {
  const keys = Object.keys(obj) as T[];
  const cur = Math.max(1, sum(obj as Record<string, number>));
  const ratio = total / cur;

  const out: Record<T, number> = {} as any;
  let acc = 0;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      out[k] = Math.max(0, total - acc);
    } else {
      const v = Math.round((obj[k] ?? 0) * ratio);
      out[k] = Math.max(0, v);
      acc += out[k];
    }
  });
  return out;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** 부모 가중치 합을 100으로 유지. changed만 타겟으로 고치고 남는/부족분을 다른 키에서 흡수 */
function rebalanceParents(
  prev: Weights,
  changed: MetricKey,
  target: number,
  active?: readonly MetricKey[],
): Weights {
  const act = (active && active.length ? active : (Object.keys(prev) as MetricKey[])) as MetricKey[];
  const next: Weights = { ...prev };

  // 비활성 키는 0으로 고정
  (Object.keys(next) as MetricKey[]).forEach(k => {
    if (!act.includes(k)) next[k] = 0;
  });

  // 변경된 키 적용
  next[changed] = clamp(target);

  // 선택된 키 합만 100으로 맞춤
  let total = act.reduce((s, k) => s + next[k], 0);
  if (total === 100) return next;

  let delta = total - 100; // >0: 깎기, <0: 채우기
  const pool = act.filter(k => k !== changed);

  if (delta > 0) {
    for (const k of pool.sort((a, b) => next[b] - next[a])) {
      const take = Math.min(delta, next[k]);
      next[k] -= take;
      delta -= take;
      if (delta <= 0) break;
    }
  } else {
    delta = -delta;
    for (const k of pool.sort((a, b) => next[a] - next[b])) {
      const give = Math.min(delta, 100 - next[k]);
      next[k] += give;
      delta -= give;
      if (delta <= 0) break;
    }
  }
  return next;
}

const hasChildren = (k: MetricKey): k is ParentWithChildren =>
  (PARENTS_WITH_CHILDREN as readonly string[]).includes(k as any);

// 이미 있는 scaleToTotal를 활용합니다.
// (obj의 각 값을 proportionally 스케일해서 합이 total이 되게)
function scaleGroupToTotal<T extends Record<string, number>>(obj: T, total: number): T {
  return scaleToTotal(obj, Math.max(0, Math.round(total)));
}

// 핀(사용자가 조정한) 자식은 고정하고, 나머지를 (total - pinValue)에 맞춰 재분배
function rebalanceGroupKeepOne<K extends string>(
  obj: Record<K, number>,
  pinKey: K,
  pinValue: number,
  total: number
): Record<K, number> {
  const pinned = Math.max(0, Math.round(pinValue));
  const restTotal = Math.max(0, Math.round(total) - pinned);

  const { [pinKey]: _, ...rest } = obj;
  const scaledRest = scaleToTotal(rest as Record<string, number>, restTotal) as Record<K, number>;
  return { ...scaledRest, [pinKey]: pinned };
}

export default function WeightSliders({ weights, setWeights, subWeights, setSubWeights, activeKeys, syncChildrenOnParent = true, expandedKey, onToggle }: Props) {
  const [openGroups, setOpenGroups] = React.useState<Record<ParentWithChildren, boolean>>({
    food: false, transport: false, education: false, amenities: false, medical: false, delivery: false,
  });

  const toggleGroup = (k: MetricKey) => {
    if (!hasChildren(k)) return;
    setOpenGroups(prev => ({ ...prev, [k as ParentWithChildren]: !prev[k as ParentWithChildren] }));
    onToggle?.(k);
  };

  const isOpen = (k: MetricKey) => (hasChildren(k) ? openGroups[k as ParentWithChildren] : false);
  
  /** 부모 슬라이더 변경: 합 100 자동 유지 */
  const onParentChange = (k: MetricKey, v: number) => {
    setWeights(w => rebalanceParents(w, k, v, activeKeys));
  };

  // 2) 자식 정규화 유틸 (합 100으로)
  const normalize100 = (o: Record<string, number>) => {
    const s = Object.values(o).reduce((a, b) => a + b, 0) || 1;
    return Object.fromEntries(
      Object.entries(o).map(([k, v]) => [k, Math.round((v / s) * 100)])
    ) as typeof o;
  };

  // 3) 자식 핸들러: 해당 묶음만 100% 정규화, 부모는 불변
  const onChildChange = (
    group: keyof SubWeights,
    key: string,
    value: number
  ) => {
    setSubWeights(sw => {
      const next = { ...sw[group], [key]: value };
      return { ...sw, [group]: normalize100(next) };
    });
  };

  React.useEffect(() => {
    if (!syncChildrenOnParent) return;
    (PARENTS_WITH_CHILDREN as readonly ParentWithChildren[]).forEach((p) => {
      const target = clamp(weights[p]);                         // 부모 현재 값(0~100)
      const curSum = Math.round(sum(subWeights[p] as any));     // 자식들의 현재 합
      if (curSum !== target) {
        setSubWeights(prev => ({
          ...prev,
          [p]: scaleGroupToTotal(prev[p] as any, target) as any // 비율은 유지, 합만 target으로
        }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    syncChildrenOnParent,
    weights.food, weights.transport, weights.education,
    weights.amenities, weights.medical, weights.delivery
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="font-semibold">가중치 설정</div>
      </div>

      {/* 부모 슬라이더들 (합 100 유지) */}
      <div className="space-y-4">
        {METRIC_KEYS
        .filter(k => !activeKeys || activeKeys.includes(k))
        .map((k) => (
          <div key={k}>
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <span aria-hidden>{METRIC_ICON[k]}</span>
                <span>{METRIC_LABEL[k]}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-medium">{weights[k]}%</div>
                {hasChildren(k) && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(k)}
                    className="rounded-md px-1 text-slate-500 hover:text-slate-900"
                    aria-label={isOpen(k) ? '세부 닫기' : '세부 열기'}
                    title={isOpen(k) ? '세부 닫기' : '세부 열기'}
                  >
                    <span className={`inline-block transition-transform ${isOpen(k) ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                )}
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={weights[k]}
              onChange={(e) => onParentChange(k, Number(e.target.value))}
              className="w-full"
            />
          </div>
        ))}
      </div>

      {/* 하위 그룹 슬라이더들 (각 그룹 내부 합 100 유지) */}
      <div className="space-y-6 pt-2">
        {(PARENTS_WITH_CHILDREN as readonly ParentWithChildren[])
        .filter(g => isOpen(g as MetricKey))
        .filter(g => !activeKeys || activeKeys.includes(g as MetricKey))
        .map((group) => {
          const groupObj = subWeights[group];
          const keys = (SUB_KEYS[group] as (keyof typeof groupObj & string)[]) 
                      ?? (Object.keys(groupObj) as Array<keyof typeof groupObj & string>);
          return (
            <div key={group} className="rounded-xl border p-4">
              <div className="font-semibold mb-3">{METRIC_LABEL[group]} (세부)</div>
              <div className="space-y-3">
                {keys.map((ck) => {
                  const total = Math.max(0, weights[group]);     // 부모 합 (예: food=12)
                  const pct = (groupObj[ck] ?? 0);
                  const label = (SUB_LABELS as any)[group]?.[ck] ?? ck;
                  return (
                    <div key={ck}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="text-slate-600">{label}</div>
                        <div className="font-medium">{pct}%</div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={pct}
                        onChange={(e) => {
                          const newPct = Number(e.target.value);
                          onChildChange(group, ck, newPct);
                        }}
                        aria-label={`${METRIC_LABEL[group]} - ${label}`}
                        className="w-full"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
