"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/** Prefetch data-heavy destinations when the reader points at or focuses a link. */
export default function IntentLink({ onMouseEnter, onFocus, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const prefetch = () => {
    if (typeof props.href === "string") router.prefetch(props.href);
  };
  return <Link {...props} prefetch={false}
    onMouseEnter={(event) => { prefetch(); onMouseEnter?.(event); }}
    onFocus={(event) => { prefetch(); onFocus?.(event); }}
  />;
}
