import type { NextRequest } from "next/server";
import { getEmployerHistory } from "@/lib/explore";

/** At most this many employers per request, the same as the comparison panel. */
const MAX_IDS = 3;

/** H-1B filings by fiscal year for up to MAX_IDS employers: `?ids=1,2,3`. */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .slice(0, MAX_IDS);
  if (ids.length === 0) return Response.json({ rows: [] });
  try {
    return Response.json({ rows: await getEmployerHistory(ids) });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not read employer history." }, { status: 502 });
  }
}
