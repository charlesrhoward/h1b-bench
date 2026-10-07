export type InvestigationChapter = { index: number; label: string; available: boolean };

export default function InvestigationNav({ chapters }: { chapters: InvestigationChapter[] }) {
  return (
    <nav className="space-y-4 text-sm" aria-label="In this investigation">
      <p className="font-medium text-zinc-300">Follow the evidence</p>
      <ol className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        {chapters.filter((chapter) => chapter.available).map((chapter) => (
          <li key={chapter.index}>
            <a className="flex gap-2 text-zinc-400 hover:text-emerald-400" href={`#finding-${chapter.index}`}>
              <span className="font-mono text-xs leading-5 text-emerald-400">{String(chapter.index).padStart(2, "0")}</span>{chapter.label}
            </a>
          </li>
        ))}
      </ol>
      <a className="inline-block text-emerald-400 hover:underline" href="#reading-the-evidence">How to read the evidence <span aria-hidden="true">↗</span></a>
    </nav>
  );
}
