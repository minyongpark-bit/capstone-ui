type Props = {
  title: string;
  subtitle?: string;
  id?: string;
};

export default function SectionTitle({ title, subtitle, id }: Props) {
  return (
    <div id={id} className="text-center mb-8 scroll-mt-40 md:scroll-mt-48">
      <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
      {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
    </div>
  );
}
