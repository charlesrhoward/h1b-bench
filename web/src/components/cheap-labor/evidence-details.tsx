/** Keep the records available without interrupting the argument. Native HTML works without JS. */
export default function EvidenceDetails({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="evidence-details">
      <summary>{title}<span className="details-symbol" aria-hidden="true" /></summary>
      <p className="table-scroll-hint">Scroll across the table to see all columns.</p>
      <div className="evidence-details-body" role="region" aria-label={title} tabIndex={0}>{children}</div>
    </details>
  );
}
