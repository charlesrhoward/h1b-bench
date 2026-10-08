import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getEmployerLinker } from "@/lib/employer-tickers";
import { searchEmployersWithTickers } from "@/lib/employer-search";

export type EmployerHit = {
  id: number;
  href: string;
  ticker: string | null;
  parent_ticker: string | null;
  parent_name: string | null;
  parent_is_self: boolean;
  name: string;
  city: string | null;
  state: string | null;
  filings: number;
};

export type OccupationHit = {
  soc_code: string;
  soc_title: string | null;
  filings: number;
  median_wage_annual: number | null;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ employers: [], occupations: [] });
  }

  const [employers, occupations, employerHref] = await Promise.all([
    searchEmployersWithTickers(q, 7),
    supabase.rpc("search_occupations", { q, lim: 4 }),
    getEmployerLinker(),
  ]);
  return Response.json({
    employers: employers.map((hit): EmployerHit => ({ ...hit, href: employerHref(hit) })),
    occupations: (occupations.data ?? []) as OccupationHit[],
  });
}
