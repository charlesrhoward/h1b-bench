/** One numbered result on /cheap-labor: headline claim, body, then limits and source. */
export default function EvidenceSection({
  index,
  title,
  children,
  limits,
  source,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
  limits: string;
  source: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-zinc-800 pt-10">
      <p className="font-mono text-xs text-emerald-400">{String(index).padStart(2, "0")}</p>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-4 text-zinc-300">{children}</div>
      <p className="text-sm text-zinc-500">
        <span className="text-zinc-400">Limits:</span> {limits}
      </p>
      <p className="text-xs text-zinc-500">Source: {source}</p>
    </section>
  );
}
