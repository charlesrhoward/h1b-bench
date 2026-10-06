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
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 p-6">
      <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <div>
        <div className="font-mono text-5xl font-bold">{value}</div>
        <p className="mt-2 text-zinc-300">{statement}</p>
      </div>
      {children}
    </div>
  );
}
