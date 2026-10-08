/** One labor pool measure: label, headline share, statement, then supporting detail. */
export default function MeasureCard({
  label,
  value,
  statement,
  children,
}: {
  label: string;
  value: string;
  statement: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-neutral-tertiary p-6 sm:p-7">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-secondary">{label}</p>
      <div>
        <div className="type-figure text-[3.5rem]">{value}</div>
        <p className="type-body mt-3 text-neutral-primary">{statement}</p>
      </div>
      {children}
    </div>
  );
}
