"use client";

import { useCallback, useRef, useState } from "react";
import { unpack, type ExploreData, type ExploreEmployer, type ExploreLaborCell, type ExploreWire } from "@/lib/explore-model";

/** One request for all detail panels, started by viewport entry rather than a timer. */
export function useExploreData() {
  const request = useRef<Promise<void> | null>(null);
  const [data, setData] = useState<ExploreData | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    if (request.current) return;
    setFailed(false);
    request.current = fetch("/api/explore")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Explore: HTTP ${response.status}`);
        const wire: ExploreWire = await response.json();
        setData({ ...wire, employers: unpack<ExploreEmployer>(wire.employers), cells: unpack<ExploreLaborCell>(wire.cells) });
      })
      .catch((error: unknown) => {
        console.error(error);
        request.current = null;
        setFailed(true);
      });
  }, []);
  return { data, failed, load };
}

export function ExploreDataStatus({ failed, retry }: { failed: boolean; retry: () => void }) {
  if (!failed) return <p className="type-meta" role="status">Please wait for the chart data.</p>;
  return <p className="type-meta" role="status">Could not load the chart data. <button type="button" className="link" onClick={retry}>Try again</button></p>;
}
