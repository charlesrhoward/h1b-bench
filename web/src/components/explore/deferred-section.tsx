"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Keep section anchors in the document; mount expensive charts as they approach the viewport. */
export default function DeferredSection({ children, onVisible }: { children: ReactNode; onVisible?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setReady(true);
      onVisible?.();
      observer.disconnect();
    }, { rootMargin: "200px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible]);
  return <div ref={ref} style={{ minHeight: 600 }}>{ready ? children : null}</div>;
}
