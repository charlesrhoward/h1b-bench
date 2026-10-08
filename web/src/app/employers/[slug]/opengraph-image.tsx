import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getEmployerLayoffFilings, getEmployerMarketGap } from "@/lib/cheap-labor";
import { employerFlags, type EmployerFlags } from "@/lib/employer-flags";
import { loadEmployer } from "@/lib/employer-page";
import { EMPLOYER_OG_ALT, EMPLOYER_OG_SIZE } from "@/lib/employer-og";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/format";
import { getEmployerStats } from "@/lib/queries";
import type { EmployerParent } from "@/lib/employer-tickers";
import { FISCAL_YEARS } from "@/components/year-tabs";

export const alt = EMPLOYER_OG_ALT;
export const size = EMPLOYER_OG_SIZE;
export const contentType = "image/png";
// Data loads quarterly; a daily rebuild keeps cards current.
export const revalidate = 86400;

/**
 * Light-mode values of the DESIGN.md tokens. Satori renders outside the DOM, so it cannot
 * read the CSS variables in tokens.css. Keep these in step with DESIGN.md.
 */
const COLOR = {
  bg: "#ffffff", // bg-neutral-primary
  fg: "#242424", // fg-neutral-primary
  muted: "#6b6b6b", // fg-neutral-secondary
  error: "#c94a4a", // fg-error-primary
  onError: "#ffffff", // fg-neutral-tertiary
};

const fontFile = (name: string) => readFile(join(process.cwd(), "src/assets/fonts", name));
const FONTS = Promise.all([
  fontFile("inter-500.ttf"),
  fontFile("inter-700.ttf"),
  fontFile("fraunces-400.ttf"),
  fontFile("playfair-700.ttf"),
]).then(([inter500, inter700, fraunces, playfair]) => [
  { name: "Inter", data: inter500, weight: 500 as const, style: "normal" as const },
  { name: "Inter", data: inter700, weight: 700 as const, style: "normal" as const },
  { name: "Fraunces", data: fraunces, weight: 400 as const, style: "normal" as const },
  { name: "Playfair", data: playfair, weight: 700 as const, style: "normal" as const },
]);

type Stat = { label: string; value: string; alarm?: boolean };

type Card = { name: string; place: string; ticker: string | null; flags: EmployerFlags; stats: Stat[] };

/** Top-right label: the ticker, or "Subsidiary of <parent> · <ticker>". */
function tickerLabel(ticker: string | null, parent: EmployerParent | null) {
  if (ticker) return ticker;
  if (!parent) return null;
  return parent.relation === "subsidiary" ? `Subsidiary of ${parent.parent_name} · ${parent.parent_ticker}` : parent.parent_ticker;
}

async function loadCard(slug: string): Promise<Card | null> {
  const found = await loadEmployer(slug);
  if (!found) return null;
  const { employer, ticker, parent } = found;
  const [stats, gap, layoffs] = await Promise.all([
    getEmployerStats(employer.id),
    getEmployerMarketGap(employer.id),
    getEmployerLayoffFilings(employer.id),
  ]);
  const h1b = stats.filter((s) => s.visa_class === "H-1B");
  const latest = h1b.at(-1);
  const flags = employerFlags(gap, layoffs);
  return {
    name: employer.name,
    place: [employer.city, employer.state].filter(Boolean).join(", "),
    ticker: tickerLabel(ticker, parent),
    flags,
    stats: cardStats(h1b.reduce((sum, r) => sum + r.filings, 0), latest, flags),
  };
}

function cardStats(
  totalFilings: number,
  latest: { fiscal_year: number; median_wage_annual: number | null } | undefined,
  flags: EmployerFlags,
): Stat[] {
  const stats: Stat[] = [{ label: "H-1B filings, all years", value: fmtCompact(totalFilings) }];
  if (latest?.median_wage_annual) {
    const toDate = latest.fiscal_year === FISCAL_YEARS[0] ? " to date" : "";
    stats.push({ label: `Median wage, FY${latest.fiscal_year}${toDate}`, value: `$${fmtCompact(latest.median_wage_annual)}` });
  }
  if (flags.underpaid) {
    const { below_median, filings_matched } = flags.underpaid;
    stats.push({ label: "Filings below local median", value: fmtPct(below_median, filings_matched), alarm: true });
  }
  if (flags.layoffs) {
    stats.push({ label: "Workers in layoff notices", value: fmtInt(flags.layoffs.workers_laid_off), alarm: true });
  }
  return stats;
}

/** Long names get a smaller size so they fit in two lines. */
function nameSize(name: string) {
  if (name.length > 48) return 54;
  if (name.length > 28) return 66;
  return 80;
}

function FlagPill({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        background: COLOR.error,
        color: COLOR.onError,
        fontFamily: "Inter",
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: 2,
        padding: "8px 16px",
        borderRadius: 6,
      }}
    >
      {label}
    </div>
  );
}

function StatBlock({ stat }: { stat: Stat }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, borderTop: `2px solid ${stat.alarm ? COLOR.error : COLOR.fg}`, paddingTop: 14 }}>
      <div style={{ fontFamily: "Fraunces", fontSize: 56, lineHeight: 1, color: stat.alarm ? COLOR.error : COLOR.fg }}>
        {stat.value}
      </div>
      <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 20, color: COLOR.muted, marginTop: 10 }}>{stat.label}</div>
    </div>
  );
}

function Header({ ticker }: { ticker: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontFamily: "Playfair", fontWeight: 700, fontSize: 34, color: COLOR.fg }}>H1B Bench</div>
      {ticker ? (
        <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: ticker.length > 8 ? 20 : 26, color: COLOR.muted, letterSpacing: ticker.length > 8 ? 0.5 : 2 }}>{ticker}</div>
      ) : null}
    </div>
  );
}

function CardImage({ card }: { card: Card }) {
  const { underpaid, layoffs } = card.flags;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: COLOR.bg, padding: "52px 64px" }}>
      <Header ticker={card.ticker} />
      <div style={{ display: "flex", flexDirection: "column", marginTop: 36, flex: 1 }}>
        <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: nameSize(card.name), lineHeight: 1.05, color: COLOR.fg, letterSpacing: -1.5 }}>
          {card.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20 }}>
          {underpaid ? <FlagPill label="UNDERPAID" /> : null}
          {layoffs ? <FlagPill label="LAYOFFS" /> : null}
          {card.place ? <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 26, color: COLOR.muted }}>{card.place}</div> : null}
        </div>
      </div>
      <div style={{ display: "flex", gap: 32 }}>
        {card.stats.map((stat) => (
          <StatBlock key={stat.label} stat={stat} />
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 22, fontFamily: "Inter", fontWeight: 500, fontSize: 18, color: COLOR.muted }}>
        h1b-bench.com · U.S. Department of Labor H-1B data
      </div>
    </div>
  );
}

function NotFoundImage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: COLOR.bg, padding: "52px 64px" }}>
      <Header ticker={null} />
      <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 64, color: COLOR.fg }}>Employer not found</div>
      <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: 18, color: COLOR.muted }}>h1b-bench.com</div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [card, fonts] = await Promise.all([loadCard(slug), FONTS]);
  return new ImageResponse(card ? <CardImage card={card} /> : <NotFoundImage />, { ...size, fonts });
}
