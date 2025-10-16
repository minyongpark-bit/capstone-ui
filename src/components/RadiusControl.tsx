import type { RadiusKey } from '@/lib/types';
import { RADIUS_LIST } from '@/lib/constants';


type Props = { value: RadiusKey; onChange: (v: RadiusKey) => void };
export default function RadiusControl({ value, onChange }: Props) {
    return (
        <div className="flex flex-wrap gap-2">
            {RADIUS_LIST.map((r) => (
                <button key={r} onClick={() => onChange(r)} className={`px-4 py-2 rounded-full border ${value === r ? 'bg-slate-900 text-white' : 'bg-white'}`}>{r}</button>
            ))}
        </div>
    );
}