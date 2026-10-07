export type InvestigationChapter = { index: number; label: string; available: boolean };

export default function InvestigationNav({ chapters }: { chapters: InvestigationChapter[] }) {
  return (
    <nav className="space-y-4 rounded-xl bg-neutral-tertiary p-5 text-sm sm:p-6" aria-label="In this investigation">
      <p className="type-promo">Follow the evidence</p>
      <ol className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        {chapters.filter((chapter) => chapter.available).map((chapter) => (
          <li key={chapter.index}>
            <a className="flex gap-2 text-neutral-secondary hover:text-neutral-primary-hover" href={`#finding-${chapter.index}`}>
              <span className="text-xs font-medium leading-5 tabular-nums text-accent-primary">{String(chapter.index).padStart(2, "0")}</span>{chapter.label}
            </a>
          </li>
        ))}
      </ol>
      <a className="link inline-block" href="#reading-the-evidence">How to read the evidence <span aria-hidden="true">↗</span></a>
    </nav>
  );
}
