'use client';
import React from 'react';
import { METRIC_LABEL } from '@/lib/constants';
import type { MetricKey } from '@/lib/types';

type Props = {
  selected: MetricKey[];
  allKeys: MetricKey[];
  onChange: (next: MetricKey[]) => void;
};

export default function CategoryPicker({ selected, allKeys, onChange }: Props) {
  const avail = allKeys.filter(k => !selected.includes(k));

  const onDropTo = (toSelected: boolean, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain') as MetricKey;
    if (!key) return;

    if (toSelected) {
      if (!selected.includes(key)) onChange([...selected, key]);
    } else {
      onChange(selected.filter(k => k !== key));
    }
  };

  const Chip = ({ k }: { k: MetricKey }) => (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', k)}
      className="cursor-grab select-none rounded-lg border px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
      title={METRIC_LABEL[k]}
    >
      {METRIC_LABEL[k]}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className="min-h-28 rounded-xl border bg-slate-50/60 p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropTo(true, e)}
      >
        <div className="mb-2 text-xs font-semibold text-slate-500">선택됨</div>
        <div className="flex flex-wrap gap-2">
          {selected.map(k => <Chip key={k} k={k} />)}
        </div>
      </div>
      <div
        className="min-h-28 rounded-xl border bg-slate-50/60 p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onDropTo(false, e)}
      >
        <div className="mb-2 text-xs font-semibold text-slate-500">후보</div>
        <div className="flex flex-wrap gap-2">
          {avail.map(k => <Chip key={k} k={k} />)}
        </div>
      </div>
    </div>
  );
}