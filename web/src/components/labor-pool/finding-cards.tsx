import { fmtPct } from "@/lib/format";
import type { LcaYearProfile } from "@/lib/labor-pool";

/** The three facts about the filings themselves, from the lca_year_profile view. */
export default function FindingCards({ profile }: { profile: LcaYearProfile }) {
  const findings = [
    {
      value: fmtPct(profile.wage_level_1_2, profile.wage_level_known),
      text: "of filings are at DOL wage Level I or II. DOL uses these levels for entry and qualified workers. Levels III and IV are for experienced workers.",
    },
    {
      value: fmtPct(profile.new_employment_filings, profile.certified_filings),
      text: "of filings are for new hires. The other filings extend, amend, or move the jobs of H-1B workers who already work in the U.S.",
    },
    {
      value: fmtPct(profile.top20_occupation_filings, profile.certified_filings),
      text: "of filings are in 20 occupations. These occupations are large, so the survey counts for them are precise.",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {findings.map((f) => (
        <div key={f.text} className="rounded-lg border border-zinc-800 p-5">
          <div className="font-mono text-3xl font-bold text-emerald-400">{f.value}</div>
          <p className="mt-2 text-sm text-zinc-400">{f.text}</p>
        </div>
      ))}
    </div>
  );
}
