"use client";

import { useEffect, useState } from "react";
import type { EmployerHistoryRow } from "@/lib/explore-model";

type Entry = { rows: EmployerHistoryRow[]; expires: number };
const histories = new Map<number, Entry>();
const pending = new Map<number, Promise<EmployerHistoryRow[]>>();
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

async function fetchHistory(ids: number[]) {
  const res = await fetch(`/api/employer-history?ids=${ids.join(",")}`);
  if (!res.ok) throw new Error(`Employer history: HTTP ${res.status}`);
  const body: { rows: EmployerHistoryRow[] } = await res.json();
  saveHistory(ids, body.rows);
  return body.rows;
}

function startHistory(ids: number[]) {
  const request = fetchHistory(ids);
  for (const id of ids) {
    pending.set(id, request
      .then((rows) => rows.filter((row) => row.employer_id === id))
      .finally(() => pending.delete(id)));
  }
}

async function loadHistory(ids: number[]) {
  const cached = ids.map(readHistory);
  const missing = ids.filter((id, index) => !cached[index] && !pending.has(id));
  if (missing.length) startHistory(missing);
  const rows = await Promise.all(ids.map((id, index) => cached[index] ?? pending.get(id) ?? EMPTY_ROWS));
  return rows.flat();
}

/** Share cached and pending reads, even when selection changes before a request finishes. */
export function useEmployerHistory(ids: number[]) {
  const key = [...new Set(ids)].sort((a, b) => a - b).join(",");
  const [state, setState] = useState({ key: "", rows: EMPTY_ROWS, failed: false });
  useEffect(() => {
    if (!key) return;
    let disposed = false;
    loadHistory(key.split(",").map(Number))
      .then((rows) => {
        if (!disposed) setState({ key, rows, failed: false });
      })
      .catch((error: unknown) => {
        if (disposed) return;
        console.error(error);
        setState({ key, rows: EMPTY_ROWS, failed: true });
      });
    // Let shared requests fill the cache; an obsolete subscriber must not cancel them.
    return () => { disposed = true; };
  }, [key]);
  return {
    rows: state.key === key ? state.rows : EMPTY_ROWS,
    failed: state.key === key && state.failed,
    loading: key !== "" && state.key !== key,
  };
}
