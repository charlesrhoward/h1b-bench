/** Keep the records available without interrupting the argument. Native HTML works without JS. */
export default function EvidenceDetails({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="evidence-details border-y border-neutral-tertiary font-ui">
      <summary className="cursor-pointer type-small py-4 font-medium text-neutral-primary hover:text-accent-primary">{title}</summary>
      <p className="type-meta pb-3 sm:hidden">Scroll across the table to see all columns.</p>
      <div className="evidence-details-body space-y-4 overflow-x-auto overscroll-contain pb-4 text-sm leading-relaxed [&_table]:min-w-[580px]" role="region" aria-label={title} tabIndex={0}>{children}</div>
    </details>
  );
}
