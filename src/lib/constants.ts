import type { MetricKey, RadiusKey } from './types';

export const METRIC_LABEL: Record<MetricKey, string> = {
    safety: '안전',
    amenities: '편의시설',
    food: '음식점',
    culture: '문화',
    accessibility: '접근성',
};

// 점수 구간별 색 (범례와 동일)
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
  { key: 'good', color: SCORE_COLORS.good, range: '80-89점', label: '우수' },
  { key: 'fair', color: SCORE_COLORS.fair, range: '70-79점', label: '양호' },
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

// 카테고리 아이콘
export const METRIC_ICON: Record<MetricKey, React.ReactNode> = {
  safety:        '🛡️',
  amenities:     '🛒',
  food:          '🍽️',
  culture:       '🎭',
  accessibility: '🚇',
};


export const RADIUS_LIST: RadiusKey[] = ['100m', '300m', '500m', '1000m'];
export const RADIUS_METERS: Record<RadiusKey, number> = {
    '100m': 100,
    '300m': 300,
    '500m': 500,
    '1000m': 1000,
};