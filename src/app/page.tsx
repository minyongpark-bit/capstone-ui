'use client';
import React, { useMemo, useState } from 'react';
import SectionTitle from '@/components/SectionTitle';
import Stat from '@/components/Stat';
import Chip from '@/components/Chip';
import RadiusControl from '@/components/RadiusControl';
import ScoreCard from '@/components/ScoreCard';
import WeightSliders from '@/components/WeightSliders';
import RankingList from '@/components/RankingList';
import { METRIC_LABEL, RADIUS_LIST, METRIC_ICON, colorByScore, SCORE_LEGEND, percentileByScore } from '@/lib/constants';
import { weightedScore } from '@/lib/scoring';
import type { Location, MetricKey, RadiusKey, Weights } from '@/lib/types';
import { mockLocations } from '@/data/mockLocations';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full rounded-xl bg-slate-100 animate-pulse" />
  ),
});

const DEFAULT_WEIGHTS: Weights = { safety: 20, amenities: 20, food: 20, culture: 20, accessibility: 20 };

export default function Page() {
  const [radius, setRadius] = useState<RadiusKey>('500m');
  const [selected, setSelected] = useState<Location>(mockLocations[0]);
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });

  const [query, setQuery] = useState('');
  const [searchError, setSearchError] = useState('');

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const q = query.trim();
    if (!q) return;

    // 이름이나 주소에 검색어가 포함된 첫 번째 위치 찾기
    const match = mockLocations.find(
      (loc) =>
        loc.name.includes(q) ||
        loc.address.includes(q)
    );

    if (match) {
      setSelected(match);   // 선택 지역 바꾸기 → 지도 & 오른쪽 카드가 같이 바뀜
      setSearchError('');
    } else {
      setSearchError('검색 결과가 없습니다. (예: 강남구, 종로구, 중구)');
    }
  };

  const selectedScore = useMemo(() => selected.scores[radius], [selected, radius]);
  const selectedWeighted = useMemo(() => weightedScore(selectedScore, weights), [selectedScore, weights]);


  const ranking = useMemo(() => {
    return [...mockLocations]
      .map((loc) => ({ loc, score: weightedScore(loc.scores[radius], weights) }))
      .sort((a, b) => b.score - a.score);
  
  }, [radius, weights]);

  const averages = useMemo(() => {
    const sum: Record<MetricKey, number> = { safety: 0, amenities: 0, food: 0, culture: 0, accessibility: 0 };
    mockLocations.forEach((l) => {
      const s = l.scores[radius];
      (Object.keys(s) as MetricKey[]).forEach((k) => { sum[k] += s[k]; });
    });
    const avg: Record<MetricKey, number> = { safety: 0, amenities: 0, food: 0, culture: 0, accessibility: 0 };
    (Object.keys(sum) as MetricKey[]).forEach((k) => (avg[k] = Math.round(sum[k] / mockLocations.length)));
    return avg;
  }, [radius]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      {/* HERO */}
      <header className="py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-900/90 text-white flex items-center justify-center mb-5">📍</div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">동네 지표</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-500">데이터 기반으로 지역을 분석하고, 나만의 기준으로 최적의 장소를 찾아보세요</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a href="#map" className="px-5 py-3 rounded-xl bg-slate-900 text-white font-medium shadow hover:bg-slate-800 inline-flex">
              지도 분석 시작하기 ▾
            </a>
            <a href="#category" className="px-5 py-3 rounded-xl border font-medium bg-white shadow-sm inline-flex">
              자세히 알아보기
            </a>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6">
            <Stat value="20만+" label="서울시 주소 데이터" />
            <Stat value="5개" label="맞춤 분석 카테고리" />
            <Stat value="4개" label="반경별 상세 분석" />
          </div>
        </div>
      </header>

      {/* 핵심 분석 카테고리 */}
      <section id="category" className="py-16 scroll-mt-24">
        <div className="container mx-auto max-w-6xl px-4">
          <SectionTitle title="핵심 분석 카테고리" />
          <div className="grid md:grid-cols-3 gap-6">
            {([
              { k: 'safety' as MetricKey, desc: '범죄지수 및 치안 데이터 분석' },
              { k: 'amenities' as MetricKey, desc: '편의점, 마트 등 생활편의 시설' },
              { k: 'food' as MetricKey, desc: '다양한 음식점 및 카페 밀집도' },
              { k: 'culture' as MetricKey, desc: '문화시설, 여가 공간 분포' },
              { k: 'accessibility' as MetricKey, desc: '대중교통 및 주요 시설 접근성' },
            ]).map((m) => (
              <div key={m.k} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="text-sm text-slate-500">카테고리</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-lg" aria-hidden>{METRIC_ICON[m.k]}</span>
                  <div className="font-semibold">{METRIC_LABEL[m.k]}</div>
                </div>
                <p className="mt-3 text-slate-600">{m.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <div className="text-slate-600 mb-4">다양한 활용 분야</div>
            <div className="flex flex-wrap justify-center gap-6">
              {['주거지 선택', '상권 분석', '부동산 투자', '도시 계획', '여행지 선택', '입지 분석'].map((t) => (
                <Chip key={t} variant="filled" size="lg">{t}</Chip>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 인터랙티브 지역 지도 */}
      <section className="py-16">
        <div className="container mx-auto max-w-6xl px-4">
          <SectionTitle title="인터랙티브 지역 지도" subtitle="서울시 주요 지역을 클릭하여 상세 정보를 확인하세요" />
          <form onSubmit={handleSearch} className="mt-4 mb-4 flex flex-col gap-2 md:flex-row md:items-center">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예: 강남구, 종로구, 중구..." className="flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/80"/>
            <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
              검색
            </button>
          </form>

          {searchError && (
            <p className="mb-4 text-sm text-red-500">{searchError}</p>
          )}
          <div id="map" className="grid md:grid-cols-2 gap-6 items-start scroll-mt-24 md:scroll-mt-28">
            <div className="rounded-2xl border shadow-sm overflow-hidden bg-white">
              <MapView locations={mockLocations} selected={selected} radius={radius} weights={weights} onSelect={setSelected} />
            </div>
            <div className="rounded-2xl border shadow-sm bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-500">선택 지역</div>
                  <h3 className="text-xl font-semibold mt-1">{selected.name}</h3>
                  <div className="text-slate-500 text-sm">{selected.address}</div>
                </div>
                <Chip>{radius}</Chip>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {(Object.keys(selectedScore) as MetricKey[]).map((k) => (
                  <div key={k} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base" aria-hidden>{METRIC_ICON[k]}</span>
                        <div className="text-sm text-slate-600">{METRIC_LABEL[k]}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] leading-none text-slate-400">
                          {percentileByScore(selectedScore[k])}
                        </div>
                        <div className="text-lg font-semibold" style={{ color: colorByScore(selectedScore[k]) }}>
                          {selectedScore[k]}점
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="text-sm text-slate-500 mb-2">종합 생활 점수</div>
                <div className="text-5xl font-bold">
                  {selectedWeighted} <span className="text-2xl text-slate-400">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* 반경 선택 */}
          <div className="mt-8 rounded-2xl border bg-white shadow-sm p-6">
            <div className="text-sm font-medium mb-3">분석 반경 선택</div>
            <RadiusControl value={radius} onChange={setRadius} />
            <p className="mt-2 text-sm text-slate-500">선택한 반경 내의 생활 인프라를 분석합니다</p>
          </div>

          {/* 반경별 비교 + 범례 */}
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="font-medium mb-3">반경별 비교</div>
              <div className="space-y-3">
                {RADIUS_LIST.map((r) => {
                  const sc = weightedScore(selected.scores[r], weights);
                  const active = r === radius;
                  return (
                    <div key={r} className={`flex items-center justify-between rounded-xl border p-4 ${active ? 'ring-2 ring-slate-900/80' : ''}`}>
                      <div>{r}</div>
                      <div className="font-semibold" style={{ color: colorByScore(sc) }}>
                        {sc}점
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="font-medium mb-3">점수 범례</div>
              <div className="grid grid-cols-2 gap-4">
                {SCORE_LEGEND.map(v => (
                  <div key={v.key} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ background: v.color }} />
                    <div>
                      <div className="font-medium">{v.range}</div>
                      <div className="text-sm text-slate-500">{v.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 맞춤형 지역 분석 */}
      <section className="py-16 bg-slate-50/70">
        <div className="container mx-auto max-w-6xl px-4">
          <SectionTitle title="맞춤형 지역 분석" subtitle="가중치를 조정하여 나만의 기준으로 지역을 평가해보세요" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <WeightSliders weights={weights} setWeights={setWeights} />
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-2 rounded-lg border" onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}>가중치 초기화</button>
                <button className="px-3 py-2 rounded-lg border" onClick={() => setWeights({ safety: 40, amenities: 20, food: 15, culture: 10, accessibility: 15 })}>예: 안전 중시</button>
              </div>
            </div>
            <ScoreCard location={selected} radius={radius} weights={weights} />
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="font-semibold mb-4">지역 순위 <span className="text-slate-400 ml-1 text-sm">(설정한 가중치 기준)</span></div>
              <RankingList items={ranking} selectedId={selected.id} onPick={setSelected} />
            </div>
          </div>


          {/* 카테고리별 전체 평균 */}
          <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="font-semibold mb-4">카테고리별 전체 평균</div>
            <div className="space-y-4">
              {(Object.keys(averages) as MetricKey[]).map((k) => (
                <div key={k}>
                  <div className="flex items-center justify-between text-sm">
                    {/* 아이콘 + 라벨 */}
                    <div className="flex items-center gap-2">
                      <span className="text-base" aria-hidden>{METRIC_ICON[k]}</span>
                      <span>{METRIC_LABEL[k]}</span>
                    </div>
                    <div className="font-medium">{averages[k]}점</div>
                  </div>

                  <div className="mt-1 h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${averages[k]}%`,
                        background: colorByScore(averages[k]),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t py-12">
        <div className="container mx-auto max-w-6xl px-4 grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-semibold">지역 생활 점수 지도</div>
            <div className="text-slate-500 mt-1">데이터 기반 지역 분석 서비스</div>
          </div>
          <div>
            <div className="font-semibold">프로젝트 정보</div>
            <div className="text-slate-500 mt-1">Team 4 · 2025년 프로젝트 · 서울시 데이터 기반</div>
          </div>
          <div>
            <div className="font-semibold">데이터 출처</div>
            <div className="text-slate-500 mt-1">OpenStreetMap, Kakao Local API, 공공 데이터 포탈, 행정안전부 API</div>
          </div>
        </div>
        <div className="mt-8 text-center text-slate-400 text-sm">© 2025 지역 생활 점수 지도 – Team 4. All rights reserved.</div>
      </footer>
    </div>
  );
}