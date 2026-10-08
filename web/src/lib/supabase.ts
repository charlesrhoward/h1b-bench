import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Public government data changes only when an ETL load runs. Cache reads for one hour.
 * Purge deployment data/route caches after a bulk reload: an intermediate empty response
 * is a successful read and can otherwise remain cached until revalidation.
 */
const DATA_REVALIDATE_SECONDS = 3600;

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => {
        const method = init?.method ?? "GET";
        const revalidate = method === "GET" || method === "HEAD" ? DATA_REVALIDATE_SECONDS : 0;
        return fetch(input, { ...init, next: { revalidate } });
      },
    },
  },
);
