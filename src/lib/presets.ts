'use client'
import type { WeightPreset } from './types';

const KEY = 'ls.weightPresets.v1';

export function loadPresets(): WeightPreset[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function savePresets(ps: WeightPreset[]) {
  localStorage.setItem(KEY, JSON.stringify(ps));
}
