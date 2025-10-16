import type { Location } from '@/lib/types';


type Item = { loc: Location; score: number };


type Props = { items: Item[]; selectedId: string; onPick: (loc: Location) => void };


export default function RankingList({ items, selectedId, onPick }: Props) {
    return (
        <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {items.map((r, idx) => (
                <button key={r.loc.id} onClick={() => onPick(r.loc)} className={`w-full text-left rounded-xl border px-4 py-3 flex items-center justify-between ${selectedId === r.loc.id ? 'ring-2 ring-slate-900/80' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-6 text-slate-500">{idx + 1}</div>
                        <div>
                            <div className="font-medium">{r.loc.name}</div>
                            <div className="text-xs text-slate-500 line-clamp-1">{r.loc.address}</div>
                        </div>
                    </div>
                    <div className="font-semibold text-slate-900">{r.score}점</div>
                </button>
            ))}
        </div>
    );
}