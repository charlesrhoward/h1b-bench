import { getExploreData } from "@/lib/explore";

export const revalidate = 3600;

/** The full, unsampled chart dataset is shared by every visitor and all three detail panels. */
export async function GET() {
  return Response.json(await getExploreData(), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300" },
  });
}
