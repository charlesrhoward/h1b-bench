import { getEmployer } from "./queries";
import { employerSegment, parseEmployerParam } from "./employer-path";
import { getTickerMap } from "./employer-tickers";

/** Employer id from the URL segment: a trailing id, or a ticker from employer_tickers. */
async function resolveEmployerId(slug: string): Promise<number | null> {
  const param = parseEmployerParam(slug);
  if (param.kind === "id") return param.id;
  if (param.kind === "invalid") return null;
  const { byTicker } = await getTickerMap();
  return byTicker.get(param.ticker) ?? null;
}

/** The employer and its canonical URL segment, or null when the URL matches no employer. */
export async function loadEmployer(slug: string) {
  const employerId = await resolveEmployerId(slug);
  if (employerId == null) return null;
  const [employer, { byId, parentById }] = await Promise.all([getEmployer(employerId), getTickerMap()]);
  if (!employer) return null;
  const ticker = byId.get(employer.id) ?? null;
  const parent = parentById.get(employer.id) ?? null;
  return { employer, ticker, parent, segment: employerSegment({ ...employer, ticker }) };
}
