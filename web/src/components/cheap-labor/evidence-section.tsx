/** One numbered result on /cheap-labor: headline claim, body, then limits and source. */
export default function EvidenceSection({
  index,
  title,
  children,
  limits,
  source,
  takeaway,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
  limits: string;
  source: React.ReactNode;
  takeaway?: string;
}) {
  return (
    <section className="evidence-section scroll-mt-8 space-y-4 border-t border-zinc-800 pt-10" id={`finding-${index}`} aria-labelledby={`finding-title-${index}`}>
      <p className="font-mono text-xs text-emerald-400">Finding {String(index).padStart(2, "0")}</p>
      <h2 className="text-2xl font-bold tracking-tight text-balance" id={`finding-title-${index}`}>{title}</h2>
      {takeaway ? <p className="text-lg leading-relaxed text-zinc-100">{takeaway}</p> : null}
      <div className="space-y-4 leading-relaxed text-zinc-300">{children}</div>
      <aside className="space-y-1 border-l-2 border-zinc-800 pl-4 text-sm leading-relaxed text-zinc-500">
        <strong className="font-medium text-zinc-400">What this can’t tell us</strong>
        <p>{limits}</p>
      </aside>
      <p className="text-xs leading-relaxed text-zinc-500">Source: {source}</p>
    </section>
  );
}
