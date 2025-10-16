export type RadiusKey = '100m' | '300m' | '500m' | '1000m';
export type MetricKey = 'safety' | 'amenities' | 'food' | 'culture' | 'accessibility';


export type ScoresByMetric = Record<MetricKey, number>; // 0~100
export type ScoresByRadius = Record<RadiusKey, ScoresByMetric>;


export interface Location {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    scores: ScoresByRadius;
}


export type Weights = Record<MetricKey, number>; // 합계 100 권장