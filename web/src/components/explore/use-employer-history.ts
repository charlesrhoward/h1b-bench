"use client";

import { useEffect, useState } from "react";
import type { EmployerHistoryRow } from "@/lib/explore-model";

type Entry = { rows: EmployerHistoryRow[]; expires: number };
const histories = new Map<number, Entry>();
const CACHE_MS = 3600_000;
const MAX_CACHED_EMPLOYERS = 100;
const EMPTY_ROWS: EmployerHistoryRow[] = [];

function readHistory(id: number) {
  const entry = histories.get(id);
  return entry && entry.expires > Date.now() ? entry.rows : undefined;
}

function saveHistory(ids: number[], rows: EmployerHistoryRow[]) {
  for (const id of ids) {
    histories.delete(id);
    histories.set(id, { rows: rows.filter((row) => row.employer_id === id), expires: Date.now() + CACHE_MS });
  }
  for (const id of histories.keys()) {
    if (histories.size <= MAX_CACHED_EMPLOYERS) break;
    histories.delete(id);
  }
}

async function loadHistory(ids: number[], signal: AbortSignal) {
  const missing = ids.filter((id) => !readHistory(id));
  if (missing.length) {
    const res = await fetch(`/api/employer-history?ids=${missing.join(",")}`, { signal });
    if (!res.ok) throw new Error(`Employer history: HTTP ${res.status}`);
    const body: { rows: EmployerHistoryRow[] } = await res.json();
    if (!signal.aborted) saveHistory(missing, body.rows);
  }
  return ids.flatMap((id) => readHistory(id) ?? []);
}

/** Changing a comparison reads only employers that are not already cached in this browser. */
export function useEmployerHistory(ids: number[]) {
  const key = [...new Set(ids)].sort((a, b) => a - b).join(",");
  const [state, setState] = useState({ key: "", rows: EMPTY_ROWS, failed: false });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    loadHistory(key.split(",").map(Number), controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setState({ key, rows, failed: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ key, rows: EMPTY_ROWS, failed: true });
      });
    return () => controller.abort();
  }, [key]);
  return {
    rows: state.key === key ? state.rows : EMPTY_ROWS,
    failed: state.key === key && state.failed,
    loading: key !== "" && state.key !== key,
  };
}
