'use client';
import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Chip from '@/components/Chip';
import RadiusControl from '@/components/RadiusControl';
import WeightSliders from '@/components/WeightSliders';
import RankingList from '@/components/RankingList';
import { weightedScore } from '@/lib/scoring';
import { METRIC_LABEL, METRIC_ICON, colorByScore, percentileByScore, RADIUS_LIST, RADIUS_METERS, METRIC_KEYS } from '@/lib/constants';
import type { AddressDetail, Location, MetricKey, RadiusKey, Weights, SubWeights, WeightPreset } from '@/lib/types';
import { mockLocations } from '@/data/mockLocations';
import type { ServerPoint } from '@/lib/server-types';
import CategoryPicker from '@/components/CategoryPicker';
import { loadPresets, savePresets } from '@/lib/presets';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type RdsDetail = {
  food?: number;
  medical_lv2?: number;
  medical_lv3?: number;
  // 필요 시 다른 키도 추가 가능
};

const ALL_KEYS: MetricKey[] = [
  'food','transport','safety','education','price','amenities','medical','special','delivery'
];

const DEFAULT_WEIGHTS: Weights = {
  food: 12, transport: 11, safety: 11, education: 11, price: 11,
  amenities: 11, medical: 11, special: 11, delivery: 11,
};
const DEFAULT_SUB_WEIGHTS: SubWeights = {
  food: { korean: 3, japanese: 3, chinese: 3, western: 2, other: 1 },
  transport: { subway: 7, bus: 4 },
  education: { elementary: 4, middle: 4, high: 3 },
  amenities: { cafe: 6, convenience: 5 },
  medical: { general: 5, university: 6 },
  delivery: { r500: 4, r1000: 4, r1500: 3 },
};

// 반경 → 줌 근사 매핑(서버 로직과 비슷하게)
const ZOOM_BY_RADIUS: Record<RadiusKey, number> = {
  '100m': 19, '300m': 18, '500m': 17, '1000m': 16,
};

// 중심(lat,lng), 거리(m)로 bbox 계산 (west,south,east,north)
function bboxFromCenter(lat: number, lng: number, meters: number) {
  const dLat = meters / 111320; // 위도 1도 ≈ 111.32km
  const dLng = meters / (111320 * Math.cos((lat * Math.PI) / 180) || 1);
  const west = lng - dLng;
  const south = lat - dLat;
  const east = lng + dLng;
  const north = lat + dLat;
  return [west, south, east, north] as const;
}

// /api/scores 응답을 유연하게 표준화(배열/GeoJSON/객체 등)
function normalizeScoresPayload(raw: any): ServerPoint[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.points)) return raw.points;
  if (Array.isArray(raw?.features)) {
    return raw.features.map((f: any) => ({
      id: f.id,
      lat: f.geometry?.coordinates?.[1],
      lng: f.geometry?.coordinates?.[0],
      score: Number(f.properties?.score ?? 0),
      medical_lv2: Number(f.properties?.medical_lv2 ?? 0),
      medical_lv3: Number(f.properties?.medical_lv3 ?? 0),
    }));
  }
  // 단일 객체일 수도 있음
  if (raw && typeof raw === 'object' && 'lat' in raw && 'lng' in raw) return [raw as ServerPoint];
  return [];
}

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

function DetailRows({
  metric,
  rds,
}: {
  metric: MetricKey;
  rds: RdsDetail | null;
}) {
  type Item = { label: string; value?: number };
  const items: Item[] = [];

  if (metric === 'medical') {
    items.push({ label: '종합병원(2차)', value: rds?.medical_lv2 });
    items.push({ label: '대학병원(3차)', value: rds?.medical_lv3 });
  } else if (metric === 'food') {
    // 서버가 세부 항목을 주면 여기에 추가: rds?.food_korean 등
    items.push({ label: '음식점(종합)', value: rds?.food });
  }

  const rows = items.filter(i => typeof i.value === 'number');

  if (!rows.length) {
    return (
      <div className="mt-2 rounded-lg bg-slate-50 border p-3 text-xs text-slate-500">
        이 카테고리의 세부 데이터는 아직 없습니다.
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border p-3 bg-slate-50">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between py-1">
          <span className="text-sm">{label}</span>
          <span className="font-semibold" style={{ color: colorByScore(value!) }}>
            {Math.round(value!)}점
          </span>
        </div>
      ))}
    </div>
  );
}

const mixByWeights = (values: number[], weights: number[]) => {
  const wsum = weights.reduce((a,b)=>a+b, 0);
  if (wsum <= 0 || values.length === 0) return undefined;
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i] * (weights[i] / wsum);
  return Math.round(s);
};

export default function Page() {
  const [radius, setRadius] = useState<RadiusKey>('1000m');
  const [selected, setSelected] = useState<Location>(mockLocations[0]);
  const [tab, setTab] = useState<'weights' | 'ranking'>('weights');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<AddressDetail | null>(null);
  const [searchError, setSearchError] = useState<string>('');
  const [rdsDetail, setRdsDetail] = useState<RdsDetail | null>(null);
  const [expanded, setExpanded] = useState<MetricKey | null>(null);
  const METRIC_ORDER: MetricKey[] = [
    'food','transport','safety','education','price',
    'amenities','medical','special','delivery'
  ];
  const [activeKeys, setActiveKeys] = useState<MetricKey[]>(['food','medical']);
  const [expandedKey, setExpandedKey] = useState<MetricKey | null>(null);
  const [presets, setPresets] = useState<WeightPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('나의 프리셋');

  // 정규화 함수: activeKeys 기준으로 100% 재분배, 나머지는 0
  const normalizeTo100 = React.useCallback((w: Weights) => {
    const keys = activeKeys.length ? activeKeys : METRIC_KEYS; // 최소 안전장치
    const s = keys.reduce((acc,k)=> acc + (w[k] ?? 0), 0) || 1;
    const next: Weights = { ...w };
    keys.forEach(k => { next[k] = Math.round((w[k] ?? 0) * 100 / s); });
    METRIC_KEYS.filter(k => !keys.includes(k)).forEach(k => { next[k] = 0; });
    return next;
  }, [activeKeys]);

  const normalizeToTotal = <T extends Record<string, number>>(o: T, total: number): T => {
    const cur = Object.values(o).reduce((a, b) => a + b, 0) || 1;
    const ratio = total / cur;
    const scaled = Object.fromEntries(
      Object.entries(o).map(([k, v]) => [k, Math.round(v * ratio)])
    ) as T;
    // 반올림 오차 보정(합이 정확히 total 되게 1~2점 가산/감산)
    const diff = total - Object.values(scaled).reduce((a, b) => a + b, 0);
    if (diff !== 0) {
      const key = Object.entries(scaled).sort((a, b) => b[1] - a[1])[0][0]; // 가장 큰 항목에 보정
      (scaled as any)[key] += diff;
    }
    return scaled;
  };

  const to100 = <T extends Record<string, number>>(o: T): T => {
    const s = Object.values(o).reduce((a,b)=>a+b,0) || 1;
    return Object.fromEntries(
      Object.entries(o).map(([k,v]) => [k, Math.round((v/s)*100)])
    ) as T;
  };

  // --- 초기값(합 100) ---
  const INIT_WEIGHTS: Weights = normalizeToTotal(DEFAULT_WEIGHTS, 100);
  const INIT_SUBWEIGHTS: SubWeights = {
    food:       to100(DEFAULT_SUB_WEIGHTS.food),
    transport:  to100(DEFAULT_SUB_WEIGHTS.transport),
    education:  to100(DEFAULT_SUB_WEIGHTS.education),
    amenities:  to100(DEFAULT_SUB_WEIGHTS.amenities),
    medical:    to100(DEFAULT_SUB_WEIGHTS.medical),
    delivery:   to100(DEFAULT_SUB_WEIGHTS.delivery),
  };

  const renormParentsForActive = React.useCallback(
    (w: Weights, keys: MetricKey[]): Weights => {
      const act = keys.length ? keys : METRIC_KEYS;
      const baseSum = act.reduce((acc, k) => acc + (w[k] || 0), 0) || 1;

      const next: Weights = { ...w };
      METRIC_KEYS.forEach(k => {
        next[k] = act.includes(k) ? Math.round(((w[k] || 0) * 100) / baseSum) : 0;
      });

      // 반올림 오차 보정
      const sumAct = act.reduce((acc,k)=>acc + next[k], 0);
      const diff = 100 - sumAct;
      if (diff !== 0) {
        const maxK = [...act].sort((a,b)=>(w[b]||0)-(w[a]||0))[0];
        next[maxK] += diff;
      }
      return next;
    },
    []
  );

  // --- 기존 두 줄을 이걸로 교체 ---
  const [weights, setWeights] = useState<Weights>(() => INIT_WEIGHTS);
  const [subWeights, setSubWeights] = useState<SubWeights>(() => INIT_SUBWEIGHTS);

  // 처음 1회
  useEffect(() => {
    setWeights(prev => renormParentsForActive(prev, activeKeys));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // activeKeys 바뀔 때마다
  useEffect(() => {
    setWeights(prev => renormParentsForActive(prev, activeKeys));
  }, [activeKeys, renormParentsForActive]);

  const handlePickServer = async (p: ServerPoint) => {
    // 우측 카드의 주소/이름은 역지오 유지
    try {
      const res = await fetch(`/api/revgeo?lat=${p.lat}&lng=${p.lng}`, { cache: 'no-store' });
      const j = await res.json();

      setSelected(prev => ({
        ...prev,
        lat: p.lat,
        lng: p.lng,
        name: j.dong ? `${j.gu} ${j.dong}` : prev.name,
        address: j.address ?? prev.address,
      }));
    } catch {
      setSelected(prev => ({ ...prev, lat: p.lat, lng: p.lng }));
    }

    // 마커가 이미 점수를 들고 있으므로 즉시 실제 점수 반영
    setRdsDetail({
      food: Math.round(p.score ?? 0),
      medical_lv2: Math.round(p.medical_lv2 ?? 0),
      medical_lv3: Math.round(p.medical_lv3 ?? 0),
    });
  };

  useEffect(() => {
    // 선택 좌표 중심으로 반경 범위 bbox 생성(너무 넓지 않게 반경의 절반 사용)
    const meters = RADIUS_METERS[radius] / 2;
    const [w, s, e, n] = bboxFromCenter(selected.lat, selected.lng, meters);
    const zoom = ZOOM_BY_RADIUS[radius];
    const url = `/api/scores?bbox=${w},${s},${e},${n}&zoom=${zoom}`;

    let aborted = false;
    (async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const raw = await res.json();
        const list = normalizeScoresPayload(raw);

        // 가장 가까운 포인트 1개 선택
        let nearest: ServerPoint | null = null;
        let best = Number.POSITIVE_INFINITY;
        for (const it of list) {
          if (typeof it.lat !== 'number' || typeof it.lng !== 'number') continue;
          const d2 = (it.lat - selected.lat) ** 2 + (it.lng - selected.lng) ** 2;
          if (d2 < best) { best = d2; nearest = it; }
        }

        if (!aborted) {
          if (nearest) {
            setRdsDetail({
              food: Math.round(nearest.score ?? 0),
              medical_lv2: Math.round(nearest.medical_lv2 ?? 0),
              medical_lv3: Math.round(nearest.medical_lv3 ?? 0),
            });
          } else {
            // 범위 내 점이 없으면 0 처리
            setRdsDetail({ food: 0, medical_lv2: 0, medical_lv3: 0 });
          }
        }
      } catch {
        if (!aborted) setRdsDetail({ food: 0, medical_lv2: 0, medical_lv3: 0 });
      }
    })();

    return () => { aborted = true; };
  }, [selected.lat, selected.lng, radius]);


  /* === UI용 카테고리 점수(없으면 0 처리) === */
  // 1) uiScores를 Partial로(없는 건 undefined로 남김)
  const uiScores: Partial<Record<MetricKey, number>> = useMemo(() => {
    if (!rdsDetail) return {};
    const out: Partial<Record<MetricKey, number>> = {};

    if (typeof rdsDetail.food === 'number') out.food = Math.round(rdsDetail.food);

    const m2 = rdsDetail.medical_lv2;
    const m3 = rdsDetail.medical_lv3;
    if (typeof m2 === 'number' || typeof m3 === 'number') {
      const vals = [m2, m3].filter((v): v is number => typeof v === 'number');
      const avg = Math.round(vals.reduce((a,b)=>a+b,0) / (vals.length || 1));
      out.medical = avg;
    }
    return out;
  }, [rdsDetail]);

  // 2) 실제 계산에 쓸 점수 병합
  const mergedScores = useMemo(() => {
    const base = selected.scores[radius];

    // medical: (종합/대학) 자식 비율로 가중 평균
    let medicalFromChildren: number | undefined = undefined;
    if (rdsDetail) {
      const vs: number[] = [];
      const ws: number[] = [];
      if (typeof rdsDetail.medical_lv2 === 'number') {
        vs.push(rdsDetail.medical_lv2);
        ws.push(subWeights.medical.general ?? 0);     // 자식 비율
      }
      if (typeof rdsDetail.medical_lv3 === 'number') {
        vs.push(rdsDetail.medical_lv3);
        ws.push(subWeights.medical.university ?? 0);  // 자식 비율
      }
      medicalFromChildren = mixByWeights(vs, ws);
    }

    // food 등도 세부 자료가 생기면 동일 패턴으로 계산해서 덮어쓰기

    return {
      ...base,
      ...(uiScores.food    !== undefined ? { food: uiScores.food } : {}),
      ...(medicalFromChildren !== undefined ? { medical: medicalFromChildren } : {}),
    } as Record<MetricKey, number>;
  }, [selected, radius, uiScores, rdsDetail, subWeights]);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const res = await fetch(`/api/address/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
    const data = await res.json();
    const d: AddressDetail | null = data.items?.[0] ?? null;
    if (d) {
      setDetail(d);
      // 지도 중심/선택 갱신 (오른쪽 카드 상단 주소도 갱신)
      setSelected(prev => ({
        ...prev,
        lat: d.lat, lng: d.lng,
        name: d.dong ?? d.gu ?? '선택 주소',
        address: d.full_road_address,
      }));
      setSearchError('');
    } else {
      setSearchError('검색 결과가 없습니다.');
    }
  };

  // 슬라이더는 가공 없는 weights 그대로 사용
  const uiWeights = weights;

  // 비선택 키 0으로 마스킹
  const maskedUi = useMemo(() => {
    const out = { ...uiWeights };
    METRIC_KEYS.forEach(k => { if (!activeKeys.includes(k)) out[k] = 0; });
    return out;
  }, [uiWeights, activeKeys]);

  // 계산 직전에만 100% 정규화
  const normWeights = useMemo(() => normalizeTo100(maskedUi), [maskedUi, normalizeTo100]);

  // 점수/랭킹 계산은 normWeights로
  const overall = useMemo(() => weightedScore(mergedScores, normWeights), [mergedScores, normWeights]);
  const ranking = useMemo(
    () => [...mockLocations]
          .map((loc) => ({ loc, score: weightedScore(loc.scores[radius], normWeights) }))
          .sort((a, b) => b.score - a.score),
    [radius, normWeights]
  );

  const handleRemoveActive = (key: MetricKey) => {
    setActiveKeys(prev => prev.filter(k => k !== key)); // 후보로 되돌아감
  };

  // 초기 로드
  React.useEffect(() => {
    const ps = loadPresets();        // 유틸 없이 직접 localStorage.getItem(...) 써도 됨
    setPresets(ps);
  }, []);

  // 변경 사항 자동 저장
  React.useEffect(() => { savePresets(presets); }, [presets]);

  // 저장(신규)
  const savePreset = (name: string) => {
    const id = (crypto?.randomUUID?.() ?? String(Date.now()));
    const p: WeightPreset = {
      id, name: name || `프리셋 ${presets.length + 1}`,
      weights: JSON.parse(JSON.stringify(weights)),
      subWeights: JSON.parse(JSON.stringify(subWeights)),
      radius,
      createdAt: Date.now(),
      version: 1,
    };
    setPresets(prev => [p, ...prev]);
    setActivePresetId(id);
  };

  // 덮어쓰기(현재 선택 프리셋)
  const overwritePreset = () => {
    if (!activePresetId) return;
    setPresets(prev => prev.map(p =>
      p.id === activePresetId
        ? { ...p,
            name: presetName || p.name,
            weights: JSON.parse(JSON.stringify(weights)),
            subWeights: JSON.parse(JSON.stringify(subWeights)),
            radius }
        : p
    ));
  };

  // 적용(불러오기)
  const applyPreset = (id: string) => {
    const p = presets.find(x => x.id === id);
    if (!p) return;

    setWeights(JSON.parse(JSON.stringify(p.weights)));
    setSubWeights(JSON.parse(JSON.stringify(p.subWeights)));
    if (p.radius) setRadius(p.radius);

    // 프리셋의 표시 카테고리 = 가중치가 0보다 큰 것
    const visible = METRIC_KEYS.filter(k => (p.weights[k] ?? 0) > 0);
    setActiveKeys(visible);

    setActivePresetId(id);
    setPresetName(p.name);
  };

  // 삭제
  const deletePreset = () => {
    if (!activePresetId) return;
    setPresets(prev => prev.filter(p => p.id !== activePresetId));
    setActivePresetId(null);
  };

  return (
    <div className="relative h-screen w-screen">
      {/* 지도: 화면 전체 고정 */}
      <div className="fixed inset-0">
        <MapView
          locations={mockLocations}
          selected={selected}
          radius={radius}
          weights={weights}
          onSelect={setSelected}
          onRadiusChange={setRadius}
          onPickServer={handlePickServer}
        />
      </div>

      {/* 좌상단 툴바(검색/반경) */}
      <div className="fixed left-20 md:left-24 top-4 z-30 flex flex-col gap-3">
        <form onSubmit={handleSearch} className="flex items-center rounded-xl bg-white/90 shadow px-3 py-2 backdrop-blur">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="지역 검색 (예: 강남구)"
            className="w-56 md:w-72 bg-transparent outline-none text-sm"
          />
          <button className="ml-2 text-sm px-3 py-1 rounded-lg bg-slate-900 text-white">검색</button>
        </form>
      </div>

      {/* 우측 패널(슬라이더/랭킹 탭) */}
      <aside className="fixed right-4 top-4 bottom-4 z-30 w-[340px] md:w-[420px] rounded-2xl bg-white/95 shadow-xl backdrop-blur overflow-y-auto">
        {/* 패널 헤더: 선택 지역 요약 */}
        <div className="p-5 border-b">
          <div className="text-xs text-slate-500">선택 지역</div>
          <div className="mt-1 text-lg font-semibold">{selected.name}</div>
          <div className="text-xs text-slate-500">{selected.address}</div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-xs text-slate-500 mb-1">종합 생활 점수</div>
              <div className="text-4xl font-bold" style={{ color: colorByScore(overall) }}>
                {overall} <span className="text-base text-slate-400">/ 100</span>
              </div>
            </div>
            <Chip>{radius}</Chip>
          </div>
        </div>

        {/* 탭 전환 */}
        <div className="px-5 pt-3">
          <div className="inline-flex rounded-xl border bg-white p-1">
            <button
              onClick={() => setTab('weights')}
              className={`px-4 py-1.5 rounded-lg text-sm ${tab === 'weights' ? 'bg-slate-900 text-white' : ''}`}
            >
              가중치
            </button>
            <button
              onClick={() => setTab('ranking')}
              className={`px-4 py-1.5 rounded-lg text-sm ${tab === 'ranking' ? 'bg-slate-900 text-white' : ''}`}
            >
              랭킹
            </button>
          </div>
        </div>

        {/* 탭 내용 */}
        <div className="p-5">
          {tab === 'weights' ? (
            <>
              {/* [NEW] 프리셋 바 */}
              <div className="mb-4 rounded-2xl border bg-white/95 p-3 shadow-sm sticky top-0 z-10 backdrop-blur">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={activePresetId ?? ''}
                      onChange={(e) => {
                        const id = e.target.value || null;
                        setActivePresetId(id);
                        if (id) {
                          const p = presets.find(pp => pp.id === id);
                          setPresetName(p?.name ?? '나의 프리셋');
                        }
                      }}
                      className="flex-1 rounded-lg border px-2 py-1 text-sm"
                    >
                      <option value="">(선택된 프리셋 없음)</option>
                      {presets.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.radius ? `· ${p.radius}` : '' }
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => applyPreset(activePresetId as string)}
                      disabled={!activePresetId}
                      className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
                    >
                      불러오기
                    </button>
                    <button
                      type="button"
                      onClick={deletePreset}
                      disabled={!activePresetId}
                      className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
                    >
                      삭제
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="프리셋 이름"
                      className="flex-1 rounded-lg border px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => savePreset(presetName)}
                      className="rounded-lg border px-3 py-1 text-sm"
                    >
                      새로 저장
                    </button>
                    <button
                      type="button"
                      onClick={overwritePreset}
                      disabled={!activePresetId}
                      className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
                    >
                      덮어쓰기
                    </button>
                  </div>
                </div>
              </div>
              {/* 카테고리 피커(드래그&드롭) */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-500 mb-2">카테고리 선택</div>
                <CategoryPicker
                  selected={activeKeys}
                  allKeys={METRIC_KEYS}
                  onChange={(next) => setActiveKeys(next.length ? next : activeKeys)}
                />
              </div>

              {/* 점수 카드: 선택된 것만 렌더 */}
              <div className="grid grid-cols-1 gap-3 mb-5">
                {activeKeys.length === 0 ? (
                  <div className="rounded-xl border p-4 text-slate-500 text-sm">
                    선택된 카테고리가 없습니다. 위에서 드래그하여 추가하세요.
                  </div>
                ) : (
                  activeKeys.map((k) => {
                    const v = Math.round(mergedScores[k] ?? 0);
                    const opened = expandedKey === k;
                    return (
                      <div key={k} className="space-y-2"> {/* [ADD] 상세행을 붙이기 위해 감쌈 */}
                        {/* [CHANGE] 카드 자체를 버튼처럼 동작 */}
                        <div
                          role="button"
                          aria-expanded={opened}
                          onClick={() => setExpandedKey(prev => (prev === k ? null : k))}
                          className={`flex items-center justify-between rounded-2xl border p-5 shadow-sm min-h-[96px] cursor-pointer
                                    ${opened ? 'ring-2 ring-slate-900/10' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl" aria-hidden>{METRIC_ICON[k]}</span>
                            <div>
                              <div className="font-semibold">{METRIC_LABEL[k]}</div>
                              <div className="text-xs text-slate-500">{percentileByScore(v)}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold" style={{ color: colorByScore(v) }}>
                              {v}<span className="text-sm text-slate-400 ml-1">점</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveActive(k)}
                              className="text-xs rounded-md border px-2 py-1 hover:bg-slate-50"
                              aria-label={`${METRIC_LABEL[k]} 제거`}
                            >
                              제거
                            </button>
                          </div>
                        </div>
                        {opened && <DetailRows metric={k} rds={rdsDetail} />}
                      </div>
                    );
                  })
                )}
              </div>
              {/* 가중치 슬라이더: 선택된 것만 표시/정규화 */}
              <WeightSliders
                weights={weights}
                setWeights={setWeights}
                subWeights={subWeights}
                setSubWeights={setSubWeights}
                activeKeys={activeKeys}
                syncChildrenOnParent={false}
                expandedKey={expandedKey}
                onToggle={(k) => setExpandedKey(prev => (prev === k ? null : k))}
              />
            </>
          ) : (
            // 랭킹 그대로 (maskedWeights로 이미 반영됨)
            <div>
              <div className="text-sm font-semibold mb-3">
                지역 순위 <span className="text-slate-400 ml-1">(선택한 카테고리 + 가중치 기준)</span>
              </div>
              <RankingList items={ranking} selectedId={selected.id} onPick={setSelected} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
