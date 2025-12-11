'use client';
import { MapContainer, TileLayer, Circle, useMap, useMapEvents, Marker } from 'react-leaflet';
import { useEffect, useRef, useState } from 'react';
import type { LatLngTuple } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location, RadiusKey, Weights } from '@/lib/types';
import { RADIUS_METERS, colorByScore } from '@/lib/constants';
import type { ServerPoint } from '@/lib/server-types';

// 선택 지역 이동
function RecenterOnChange({ selected }: { selected: Location }) {
  const map = useMap();
  const first = useRef(true);

  useEffect(() => {
    const center = L.latLng(selected.lat, selected.lng);

    // 처음 로드 시 현 줌 유지한 채 위치만 세팅
    if (first.current) {
      first.current = false;
      map.setView(center, map.getZoom(), { animate: false });
      return;
    }
    // 이후 선택 변경 시에도 줌 고정 + 부드럽게 이동
    map.panTo(center, { animate: true });
  }, [selected.lat, selected.lng]); // radius 의존성 제거
  return null;
}

// 서버 점수 오버레이
function ScoreOverlay({
  weights,                   // 현재는 안 쓰더라도 시그니처 유지
  onPickServer,
  pickRadius,
}: {
  weights: Weights;
  onPickServer: (p: ServerPoint) => void;
  pickRadius: (r: RadiusKey) => void;
}) {
  const map = useMap();
  const [points, setPoints] = useState<ServerPoint[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const buildUrl = () => {
    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const zoom = map.getZoom();
    const apiPath = process.env.NEXT_PUBLIC_SCORE_API ?? '/api/scores';
    const url = new URL(apiPath, window.location.origin);
    url.searchParams.set('bbox', bbox);
    url.searchParams.set('zoom', String(zoom));
    // 필요 시 가중치 파라미터도 추가
    return url.toString();
  };

  const fetchScores = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(buildUrl(), { signal: ac.signal, cache: 'no-store' });
      const data = await res.json();
      const list: ServerPoint[] =
        data.items ?? data.points ??
        data.features?.map((f: any) => ({
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          score: f.properties.score,
          medical_lv2: f.properties.medical_lv2 ?? 0,
          medical_lv3: f.properties.medical_lv3 ?? 0,
          id: f.id
        })) ?? data;
      setPoints(list);
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error(e);
    }
  };

  useEffect(() => {
    fetchScores();
    return () => abortRef.current?.abort();
  }, []);

  useMapEvents({ moveend: fetchScores, zoomend: fetchScores });

  return (
    <>
      {points.map((p, i) => {
        const bg = colorByScore(p.score);
        return (
          <Marker
            key={p.id ?? i}
            position={[p.lat, p.lng]}
            icon={L.divIcon({
              className: 'score-badge',
              html: `<div class="badge" style="background:${bg}">${p.score}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })}
            eventHandlers={{
              click: () => {
                onPickServer(p);
                pickRadius('1000m')
              },
            }}
          />
        );
      })}
    </>
  );
}

type Props = {
  locations: Location[];         // (지금은 유지해도 되고 차후 제거 가능)
  selected: Location;
  radius: RadiusKey;
  weights: Weights;
  onSelect: (loc: Location) => void;
  onRadiusChange: (r: RadiusKey) => void;
  onPickServer: (p: ServerPoint) => void;   // 서버 포인트 선택 콜백 추가
};

export default function MapView({ locations, selected, radius, weights, onSelect: _onSelect, onRadiusChange, onPickServer, }: Props) {
  const selectedCenter: LatLngTuple = [selected.lat, selected.lng];

  const tileUrl = process.env.NEXT_PUBLIC_TILE_URL ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const attribution = tileUrl.includes('localhost') || tileUrl.includes('/tiles/')
    ? '&copy; My Map Server'
    : '&copy; OpenStreetMap contributors';

  return (
    <MapContainer center={selectedCenter} zoom={14} scrollWheelZoom className="h-full w-full">
      <TileLayer url={tileUrl} attribution={attribution} />

      {/* 서버 점수만 표시 + 클릭으로 선택/반경변경 */}
      <ScoreOverlay
        weights={weights}
        onPickServer={onPickServer}
        pickRadius={onRadiusChange}
      />

      {/* 선택 반경 */}
      <Circle center={selectedCenter} radius={RADIUS_METERS[radius]} pathOptions={{ color: '#fbbf24', fillOpacity: 0.08 }} />
      <RecenterOnChange selected={selected} />
    </MapContainer>
  );
}
