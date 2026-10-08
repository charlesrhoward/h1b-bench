import { REPO_URL } from "@/lib/site";

/**
 * One notebook-style cell: inputs, a sentence that reads the view, the chart, then notes,
 * the source files, and the method.
 */
export default function ExploreFigure({
  controls,
  readout,
  notes,
  source,
  method,
  children,
}: {
  controls: React.ReactNode;
  readout: React.ReactNode;
  notes: string[];
  source: string;
  method: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="space-y-6">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">{controls}</div>
      {readout}
      {children}
      <figcaption className="grid gap-x-10 gap-y-3 border-t border-neutral-primary pt-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ul className="type-meta list-disc space-y-1 pl-4">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p className="type-meta">
          Source: {source}{" "}
          <a href={`${REPO_URL}/blob/main/docs/${method}`} className="link">
            Method
          </a>
          .
        </p>
      </figcaption>
    </figure>
  );
}
