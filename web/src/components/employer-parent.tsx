import Link from "next/link";
import type { EmployerParent } from "@/lib/employer-tickers";

/** "2026-02-05" -> "Feb 5, 2026". */
function fmtDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function chipTitle(parent: EmployerParent) {
  const all = `See every employer under ${parent.parent_ticker}.`;
  if (parent.relation === "same_company") {
    return `This employer files with the EIN that the SEC lists for ${parent.parent_name}. ${all}`;
  }
  return `Listed as a subsidiary in ${parent.parent_name}'s annual report to the SEC. ${all}`;
}

/** Chip under an employer's name: its public parent and ticker. Links to every employer under that ticker. */
export function ParentChip({ parent }: { parent: EmployerParent | null }) {
  if (!parent) return null;
  return (
    <Link
      href={`/employers?q=${encodeURIComponent(parent.parent_ticker)}`}
      className="inline-flex items-center gap-1.5 rounded-sm border border-neutral-secondary px-1.5 py-0.5 align-middle font-ui text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-neutral-primary hover:border-brand-primary"
      title={chipTitle(parent)}
    >
      {parent.relation === "subsidiary" ? `Subsidiary of ${parent.parent_name}` : parent.parent_name}
      <span className="font-code tracking-normal text-neutral-secondary">{parent.parent_ticker}</span>
    </Link>
  );
}

/** Source line in the employer notes: where the parent link comes from. */
export function ParentNote({ parent }: { parent: EmployerParent | null }) {
  if (!parent) return null;
  return (
    <p className="type-meta">
      {parent.relation === "subsidiary"
        ? `Parent company: ${parent.parent_name} (${parent.parent_ticker}). It lists this employer as a subsidiary in its annual report to the SEC, filed ${fmtDate(parent.filed)}.`
        : `Public company: ${parent.parent_name} (${parent.parent_ticker}). This employer files with the EIN that the SEC lists for it.`}{" "}
      <a href={parent.source_url} className="link" target="_blank" rel="noreferrer">
        Source
      </a>
    </p>
  );
}
