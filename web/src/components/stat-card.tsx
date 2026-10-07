/** One headline figure with its label. Muted figures are less reliable; the reason shows on hover. */
export default function StatCard({
  label,
  value,
  muted = false,
  title,
}: {
  label: string;
  value: string;
  muted?: boolean;
  title?: string;
}) {
  return (
    <div className="border-t border-neutral-secondary pt-3" title={title}>
      <div className={`type-figure text-[2rem] sm:text-[2.5rem] ${muted ? "text-neutral-secondary" : ""}`}>
        {value}
      </div>
      <div className="mt-2 text-[13px] text-neutral-secondary">{label}</div>
    </div>
  );
}
