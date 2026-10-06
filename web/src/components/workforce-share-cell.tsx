import { workforceShare, type Headcount } from "@/lib/workforce";

/** Table cell for H-1B share of workforce; unreliable values render muted with the reason on hover. */
export default function WorkforceShareCell({
  certified,
  headcount,
}: {
  certified: number;
  headcount: Headcount | null | undefined;
}) {
  const share = workforceShare(certified, headcount);
  return (
    <td
      className={`text-right font-mono ${share.reliable ? "" : "text-zinc-500"}`}
      title={share.title}
    >
      {share.label}
    </td>
  );
}
