import type { EmployerLayoffTimeline, LayoffMonth, LayoffNotice } from "./cheap-labor";
import { fmtInt } from "./format";
import type { TimelineBin, TimelineEvent, TimelineModel, TimelineSpan } from "@/components/timeline/timeline-model";

/** Windows from docs/layoff-filings-method.md (measure 8): months Oct 2019 to May 2026, notices Oct 1, 2020 to Jun 30, 2025. */
const MONTHS = { start: "2019-10-01", end: "2026-06-01" };
const NOTICES = { start: "2020-10-01", end: "2025-06-30" };
const FOLLOW_DAYS = 365;
const MAX_SITES = 4;

const DAY_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const MONTH_FORMAT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);
export const fmtDay = (iso: string) => DAY_FORMAT.format(toDate(iso));

function addMonths(iso: string, n: number): string {
  const d = toDate(iso);
  d.setUTCMonth(d.getUTCMonth() + n);
  return toIso(d);
}

function addDays(iso: string, n: number): string {
  return toIso(new Date(toDate(iso).getTime() + n * 86_400_000));
}

/** Whole calendar months from `a` to `b`. */
function monthsBetween(a: string, b: string): number {
  const [da, db] = [toDate(a), toDate(b)];
  return (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + db.getUTCMonth() - da.getUTCMonth();
}

/** All notices with the same date. California lists one row per site, so one letter can be several rows. */
type NoticeDay = { date: string; notices: LayoffNotice[]; workers: number | null; followed: boolean; after: number; before: number };

function noticeDays(notices: LayoffNotice[]): NoticeDay[] {
  const byDate = new Map<string, LayoffNotice[]>();
  for (const n of notices) byDate.set(n.notice_date, [...(byDate.get(n.notice_date) ?? []), n]);
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => {
      const listed = rows.filter((r) => r.workers != null);
      return {
        date,
        notices: rows,
        workers: listed.length ? listed.reduce((t, r) => t + (r.workers ?? 0), 0) : null,
        followed: rows.some((r) => r.followed),
        // Notices with the same date have the same 12-month windows, so the counts are the same.
        after: rows[0].filings_after,
        before: rows[0].filings_before,
      };
    });
}

const plural = (n: number, one: string, many: string) => `${fmtInt(n)} ${n === 1 ? one : many}`;

function siteLines(rows: LayoffNotice[]): string[] {
  const line = (r: LayoffNotice) =>
    `${r.state}${r.location ? `, ${r.location}` : ""}: ${r.workers == null ? "workers not listed" : plural(r.workers, "worker", "workers")}`;
  const lines = rows.slice(0, MAX_SITES).map(line);
  return rows.length > MAX_SITES ? [...lines, `and ${rows.length - MAX_SITES} more`] : lines;
}

function noticeEvent(day: NoticeDay): TimelineEvent {
  const names = [...new Set(day.notices.map((n) => n.company))].slice(0, 2).join("; ");
  const count = day.notices.length;
  return {
    date: day.date,
    size: day.workers,
    label: day.workers == null ? "" : plural(day.workers, "worker", "workers"),
    hollow: !day.followed,
    tip: [
      `${fmtDay(day.date)} · WARN layoff ${count === 1 ? "notice" : `notices (${count})`}`,
      `Workers: ${day.workers == null ? "not listed" : fmtInt(day.workers)}`,
      ...siteLines(day.notices),
      `Name on the notice: ${names}`,
      `Next 12 months: ${plural(day.after, "H-1B filing", "H-1B filings")} for new workers`,
      `Past 12 months: ${plural(day.before, "H-1B filing", "H-1B filings")} for new workers`,
    ],
  };
}

/** The 12 months after each notice, with overlapping windows joined. */
function afterSpans(days: NoticeDay[]): TimelineSpan[] {
  const spans: TimelineSpan[] = [];
  for (const day of days) {
    const end = addDays(day.date, FOLLOW_DAYS);
    const last = spans.at(-1);
    if (last && day.date <= last.end) last.end = end > last.end ? end : last.end;
    else spans.push({ start: day.date, end });
  }
  return spans;
}

/** "3 months after a notice (Jan 18, 2023)" for the latest notice up to this month, if within 12 months. */
function sinceLine(month: string, days: NoticeDay[]): string[] {
  const prev = days.findLast((d) => d.date < addMonths(month, 1));
  if (!prev) return [];
  const since = monthsBetween(prev.date, month);
  if (since === 0) return [`Same month as a notice (${fmtDay(prev.date)})`];
  return since <= 12 ? [`${plural(since, "month", "months")} after a notice (${fmtDay(prev.date)})`] : [];
}

/** "2 months before a notice (Mar 1, 2023)" for the next notice after this month, if within 12 months. */
function untilLine(month: string, days: NoticeDay[]): string[] {
  const upcoming = days.find((d) => d.date >= addMonths(month, 1));
  if (!upcoming) return [];
  const until = monthsBetween(month, upcoming.date);
  return until <= 12 ? [`${plural(until, "month", "months")} before a notice (${fmtDay(upcoming.date)})`] : [];
}

function monthBins(months: LayoffMonth[], days: NoticeDay[]): TimelineBin[] {
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const bins: TimelineBin[] = [];
  for (let month = MONTHS.start; month < MONTHS.end; month = addMonths(month, 1)) {
    const row = byMonth.get(month);
    bins.push({
      start: month,
      end: addMonths(month, 1),
      title: `${MONTH_FORMAT.format(toDate(month))} · certified H-1B filings`,
      values: {
        new_employment: row?.new_employment ?? 0,
        change_employer: row?.change_employer ?? 0,
        not_counted: row?.not_counted ?? 0,
      },
      context: [...sinceLine(month, days), ...untilLine(month, days)],
    });
  }
  return bins;
}

/** The timeline model for one employer's layoff notices and monthly H-1B filings (method measure 8). */
export function layoffTimelineModel(timeline: EmployerLayoffTimeline): TimelineModel {
  const days = noticeDays(timeline.notices);
  return {
    domain: MONTHS,
    series: [
      { key: "new_employment", label: "New employment", color: "accent" },
      { key: "change_employer", label: "Change of employer", color: "accentTertiary" },
      { key: "not_counted", label: "Extensions and amendments (not counted)", color: "neutralTertiary" },
    ],
    views: [
      { value: "new", label: "New workers only", series: ["new_employment", "change_employer"] },
      { value: "all", label: "Add extensions", series: ["new_employment", "change_employer", "not_counted"] },
    ],
    bins: monthBins(timeline.months, days),
    events: days.map(noticeEvent),
    spans: afterSpans(days),
    markers: [
      { date: NOTICES.start, label: "Notices from Oct 2020", side: "start" },
      { date: NOTICES.end, label: "Notices to Jun 2025", side: "end" },
    ],
    eventColor: "yellow",
    legend: {
      event: "WARN layoff notice (size: workers)",
      hollowEvent: "No H-1B filing for new workers in the next 12 months",
      span: "12 months after a notice",
    },
    yLabel: "↑ Filings a month",
    labeledEvents: 3,
  };
}
