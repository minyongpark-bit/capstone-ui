'use client';
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import type { LatLngTuple } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location, RadiusKey, Weights } from '@/lib/types';
import { RADIUS_METERS, colorByScore } from '@/lib/constants';
import { weightedScore } from '@/lib/scoring';

type Props = {
  locations: Location[];
  selected: Location;
  radius: RadiusKey;
  weights: Weights;
  onSelect: (loc: Location) => void;
};

function RecenterOnChange({ selected, radius }: { selected: Location; radius: RadiusKey }) {
  const map = useMap();

  useEffect(() => {
    const center = L.latLng(selected.lat, selected.lng);

    const bounds = center.toBounds(RADIUS_METERS[radius]);

    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
  }, [map, selected.lat, selected.lng, radius]);

  return null;
}

export default function MapView({ locations, selected, radius, weights, onSelect }: Props) {
  const selectedCenter: LatLngTuple = [selected.lat, selected.lng];

  return (
    <MapContainer
      center={selectedCenter}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: 380, width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {locations.map((l) => {
        const score = weightedScore(l.scores[radius], weights);
        const color = colorByScore(score);

        return (
          <CircleMarker
            key={l.id}
            center={[l.lat, l.lng] as LatLngTuple}
            radius={8}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
            eventHandlers={{ click: () => onSelect(l) }}
          >
            {/* 점수 라벨 */}
            <Tooltip
              permanent
              direction="top"
              offset={[0, -10]}
              className="score-tooltip"
            >
              <span style={{ color, fontWeight: 700 }}>{score}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* 선택 반경 */}
      <Circle
        center={selectedCenter}
        radius={RADIUS_METERS[radius]}
        pathOptions={{ color: '#fbbf24', fillOpacity: 0.08 }}
      />
      <RecenterOnChange selected={selected} radius={radius} />
    </MapContainer>
  );
}