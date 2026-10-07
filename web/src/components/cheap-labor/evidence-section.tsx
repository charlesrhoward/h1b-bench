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
    <section className="evidence-section scroll-mt-8 space-y-6 border-t border-neutral-tertiary pt-12" id={`finding-${index}`} aria-labelledby={`finding-title-${index}`}>
      <p className="text-[13px] font-medium text-accent-primary tabular-nums">Finding {String(index).padStart(2, "0")}</p>
      <h2 className="type-heading text-balance" id={`finding-title-${index}`}>{title}</h2>
      {takeaway ? <p className="font-display text-[1.375rem] leading-snug tracking-[-0.01em] text-neutral-primary">{takeaway}</p> : null}
      <div className="type-body space-y-6 text-neutral-primary">{children}</div>
      <aside className="space-y-1 rounded-lg bg-neutral-secondary px-5 py-4 text-sm leading-relaxed text-neutral-primary">
        <strong className="font-semibold">What this can’t tell us</strong>
        <p>{limits}</p>
      </aside>
      <p className="type-meta">Source: {source}</p>
    </section>
  );
}
