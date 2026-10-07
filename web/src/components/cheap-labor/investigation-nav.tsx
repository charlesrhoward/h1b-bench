export type InvestigationChapter = { index: number; label: string; available: boolean };

export default function InvestigationNav({ chapters }: { chapters: InvestigationChapter[] }) {
  return (
    <nav className="investigation-nav" aria-label="In this investigation">
      <p className="story-kicker">In this investigation</p>
      <ol>
        {chapters.filter((chapter) => chapter.available).map((chapter) => (
          <li key={chapter.index}>
            <a href={`#finding-${chapter.index}`}>
              <span>{String(chapter.index).padStart(2, "0")}</span>{chapter.label}
            </a>
          </li>
        ))}
      </ol>
      <a className="nav-methodology" href="#reading-the-evidence">How to read the evidence <span aria-hidden="true">↗</span></a>
    </nav>
  );
}
