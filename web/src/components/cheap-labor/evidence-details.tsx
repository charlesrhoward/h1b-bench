/** Keep the records available without interrupting the argument. Native HTML works without JS. */
export default function EvidenceDetails({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="evidence-details border-y border-zinc-800">
      <summary className="cursor-pointer py-4 text-sm font-medium text-zinc-300 hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400">{title}</summary>
      <p className="pb-3 text-xs text-zinc-500 sm:hidden">Scroll across the table to see all columns.</p>
      <div className="evidence-details-body space-y-4 overflow-x-auto overscroll-contain pb-4 text-sm leading-relaxed [&_table]:min-w-[580px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400" role="region" aria-label={title} tabIndex={0}>{children}</div>
    </details>
  );
}
