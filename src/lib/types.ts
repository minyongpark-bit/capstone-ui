export type RadiusKey = '100m' | '300m' | '500m' | '1000m';
export type MetricKey = 'safety' | 'amenities' | 'food' | 'delivery' | 'transport' | 'education' | 'price' | 'medical' | 'special';


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

export type SubWeights = {
  food:       { korean: number; japanese: number; chinese: number; western: number; other: number };
  transport:  { subway: number; bus: number };
  education:  { elementary: number; middle: number; high: number };
  amenities:  { cafe: number; convenience: number };
  medical:    { general: number; university: number };
  delivery:   { r500: number; r1000: number; r1500: number };
  // 하위가 없는 카테고리는 생략( safety, price, special )
};

export type Weights = Record<MetricKey, number>; // 합계 100 권장

export type AddressDetail = {
  id: number | string;
  lat: number;
  lng: number;
  full_road_address: string;
  gu: string | null;
  dong: string | null;
  score: number;          // 음식점
  medical_lv2?: number;   // 종합병원 (없으면 0 처리)
  medical_lv3?: number;   // 대학병원 (없으면 0 처리)
};

export type WeightPreset = {
  id: string;
  name: string;
  weights: Weights;
  subWeights: SubWeights;
  radius?: RadiusKey;   // 원하면 반경도 함께 저장
  createdAt: number;
  version: 1;
};
