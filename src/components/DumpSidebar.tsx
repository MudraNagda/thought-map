import { useStore } from "../store";

export default function DumpSidebar({ onNewDump }: { onNewDump: () => void }) {
  const dumps = useStore((s) => s.dumps);
  const excerpts = useStore((s) => s.excerpts);
  const panel = useStore((s) => s.panel);
  const openDump = useStore((s) => s.openDump);

  const activeDumpId = panel.kind === "dump" ? panel.dumpId : null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Thought Map</h1>
        <button className="primary small" onClick={onNewDump}>
          + New dump
        </button>
      </div>
      <div className="sidebar-list">
        {dumps.length === 0 && (
          <div className="empty-hint">
            No dumps yet. Hit <b>+ New dump</b> and paste a thought-dump — then select
            passages inside it to grow your mind map.
          </div>
        )}
        {dumps.map((d) => {
          const dumpExcerpts = excerpts.filter((e) => e.dumpId === d.id);
          const themeCount = new Set(dumpExcerpts.map((e) => e.themeId)).size;
          return (
            <div
              key={d.id}
              className={`dump-card${activeDumpId === d.id ? " active" : ""}`}
              onClick={() => openDump(d.id)}
            >
              <div className="title">{d.title}</div>
              <div className="preview">{d.text}</div>
              <div className="meta">
                <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                <span>
                  {dumpExcerpts.length} excerpt{dumpExcerpts.length === 1 ? "" : "s"} →{" "}
                  {themeCount} theme{themeCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
