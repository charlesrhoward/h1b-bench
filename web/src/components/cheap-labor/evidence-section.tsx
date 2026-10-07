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
    <section className="evidence-section" id={`finding-${index}`} aria-labelledby={`finding-title-${index}`}>
      <p className="section-number">Finding {String(index).padStart(2, "0")}</p>
      <h2 id={`finding-title-${index}`}>{title}</h2>
      {takeaway ? <p className="section-takeaway">{takeaway}</p> : null}
      <div className="evidence-body">{children}</div>
      <aside className="evidence-limits">
        <strong>What this can’t tell us</strong>
        <p>{limits}</p>
      </aside>
      <p className="evidence-source">Source: {source}</p>
    </section>
  );
}
