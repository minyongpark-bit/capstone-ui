export default function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div className="text-center">
            <div className="text-4xl font-semibold">{value}</div>
            <div className="mt-1 text-muted-foreground">{label}</div>
        </div>
    );
}