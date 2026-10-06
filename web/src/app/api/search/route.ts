import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export type EmployerHit = {
  id: number;
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

  const [employers, occupations] = await Promise.all([
    supabase.rpc("search_employers", { q, lim: 7 }),
    supabase.rpc("search_occupations", { q, lim: 4 }),
  ]);

  return Response.json({
    employers: (employers.data ?? []) as EmployerHit[],
    occupations: (occupations.data ?? []) as OccupationHit[],
  });
}
