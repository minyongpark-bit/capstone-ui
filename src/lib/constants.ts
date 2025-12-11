import type React from 'react';
import type { MetricKey, RadiusKey, SubWeights } from './types';

// ========== 카테고리 라벨/아이콘 ==========
export const METRIC_LABEL: Record<MetricKey, string> = {
  food:        '음식',
  transport:   '교통',
  safety:      '안전',
  education:   '교육',
  price:       '가격',
  amenities:   '편의시설',
  medical:     '의료',
  special:     '특이',
  delivery:    '배달권',
};

// UI에서 반복 렌더링용(안전)
export const METRIC_KEYS: MetricKey[] = [
  'food',
  'transport',
  'safety',
  'education',
  'price',
  'amenities',
  'medical',
  'special',
  'delivery',
];

// 이모지 아이콘(원하면 바꾸셔도 됩니다)
export const METRIC_ICON: Record<MetricKey, React.ReactNode> = {
  food:        '🍽️',
  transport:   '🚇',
  safety:      '🛡️',
  education:   '🎓',
  price:       '💰',
  amenities:   '🏪',
  medical:     '🏥',
  special:     '✨',
  delivery:    '🛵',
};

// ========== 점수 색상 / 범례 / 퍼센타일 ==========
export const SCORE_COLORS = {
  high:  '#16a34a', // 90+
  good:  '#2563eb', // 80-89
  fair:  '#f59e0b', // 70-79
  low:   '#ef4444', // <70
} as const;

export const colorByScore = (score: number) => {
  if (score >= 90) return SCORE_COLORS.high;
  if (score >= 80) return SCORE_COLORS.good;
  if (score >= 70) return SCORE_COLORS.fair;
  return SCORE_COLORS.low;
};

export const SCORE_LEGEND = [
  { key: 'high', color: SCORE_COLORS.high, range: '90점 이상', label: '매우 우수' },
  { key: 'good', color: SCORE_COLORS.good, range: '80–89점', label: '우수' },
  { key: 'fair', color: SCORE_COLORS.fair, range: '70–79점', label: '양호' },
  { key: 'low',  color: SCORE_COLORS.low,  range: '70점 미만', label: '보통' },
] as const;

export const percentileByScore = (score: number): string => {
  if (score >= 95) return '상위 5%';
  if (score >= 90) return '상위 10%';
  if (score >= 85) return '상위 15%';
  if (score >= 80) return '상위 25%';
  if (score >= 75) return '상위 35%';
  if (score >= 70) return '상위 50%';
  return '하위 50%';
};

// ========== 반경 ==========
export const RADIUS_LIST: RadiusKey[] = ['100m', '300m', '500m', '1000m'];
export const RADIUS_METERS: Record<RadiusKey, number> = {
  '100m': 100,
  '300m': 300,
  '500m': 500,
  '1000m': 1000,
};

export const SUB_LABELS: {
  [K in keyof SubWeights]: Record<keyof SubWeights[K], string>
} = {
  food:      { korean: '한식', japanese: '일식', chinese: '중국식', western: '경양식', other: '기타' },
  transport: { subway: '지하철', bus: '버스' },
  education: { elementary: '초등학교', middle: '중학교', high: '고등학교' },
  amenities: { cafe: '카페', convenience: '편의점' },
  medical:   { general: '종합병원(2차)', university: '대학병원(3차)' },
  delivery:  { r500: '500m', r1000: '1000m', r1500: '1500m' },
} as const;

// 어떤 부모가 하위를 가지는지
export const HAS_CHILDREN: Partial<Record<MetricKey, true>> = {
  food: true, transport: true, education: true, amenities: true, medical: true, delivery: true,
};

export const SUB_KEYS: {
  [K in keyof SubWeights]: (keyof SubWeights[K])[];
} = {
  food:      ['korean', 'japanese', 'chinese', 'western', 'other'],
  transport: ['subway', 'bus'],
  education: ['elementary', 'middle', 'high'],
  amenities: ['cafe', 'convenience'],
  medical:   ['general', 'university'],
  delivery:  ['r500', 'r1000', 'r1500'],
};