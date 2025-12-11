export type ServerPoint = {
  id?: string | number;
  lat: number;
  lng: number;
  score: number;        // 음식점 점수
  medical_lv2?: number; // 종합병원
  medical_lv3?: number; // 대학병원
};