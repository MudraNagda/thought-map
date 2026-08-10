import { useMemo, useState } from "react";
import { useStore, themeColor } from "../store";

export default function ThemePanel({ themeId }: { themeId: string }) {
  const theme = useStore((s) => s.themes.find((t) => t.id === themeId));
  const themes = useStore((s) => s.themes);
  const dumps = useStore((s) => s.dumps);
  const excerpts = useStore((s) => s.excerpts);
  const updateTheme = useStore((s) => s.updateTheme);
  const deleteTheme = useStore((s) => s.deleteTheme);
  const deleteExcerpt = useStore((s) => s.deleteExcerpt);
  const openDump = useStore((s) => s.openDump);
  const closePanel = useStore((s) => s.closePanel);
  const focusTheme = useStore((s) => s.focusTheme);
  const [copied, setCopied] = useState(false);

  const themeExcerpts = useMemo(
    () => excerpts.filter((e) => e.themeId === themeId),
    [excerpts, themeId],
  );

  if (!theme) return null;
  const color = themeColor(themeId, themes);

  const exportMarkdown = async () => {
    const byDump = new Map<string, typeof themeExcerpts>();
    for (const ex of themeExcerpts) {
      const list = byDump.get(ex.dumpId) ?? [];
      list.push(ex);
      byDump.set(ex.dumpId, list);
    }
    let md = `# ${theme.label}\n\n`;
    if (theme.description) md += `${theme.description}\n\n`;
    md += `## Raw material\n\n`;
    for (const [dumpId, list] of byDump) {
      const dump = dumps.find((d) => d.id === dumpId);
      md += `### From “${dump?.title ?? "unknown dump"}” (${dump ? new Date(dump.createdAt).toLocaleDateString() : ""})\n\n`;
      for (const ex of list) {
        md += `> ${ex.text.replace(/\n/g, "\n> ")}\n\n`;
      }
    }
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="panel">
      <div className="panel-header">
        <div className="title" style={{ color }}>{theme.label}</div>
        <button
          className="small danger"
          onClick={() => {
            if (confirm("Delete this theme? Its excerpts will be unassigned.")) deleteTheme(themeId);
          }}
        >
          Delete
        </button>
        <button className="small" onClick={closePanel}>✕</button>
      </div>
      <div className="panel-body">
        <div className="section-title">Theme</div>
        <input
          value={theme.label}
          onChange={(e) => updateTheme(themeId, { label: e.target.value })}
          style={{ marginBottom: 8, fontWeight: 600 }}
        />
        <textarea
          placeholder="What is this theme about? (one or two sentences — this becomes your blog post angle)"
          rows={3}
          value={theme.description}
          onChange={(e) => updateTheme(themeId, { description: e.target.value })}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => focusTheme(themeId)}>Show on map</button>
          <button
            className="primary"
            onClick={exportMarkdown}
            disabled={themeExcerpts.length === 0}
          >
            {copied ? "Copied!" : "Export as blog material"}
          </button>
        </div>

        <div className="section-title">
          Excerpts ({themeExcerpts.length})
        </div>
        {themeExcerpts.length === 0 && (
          <div style={{ fontSize: 12.5, color: "#6b7280" }}>
            Nothing collected yet. Open a dump and select passages to file them here.
          </div>
        )}
        {themeExcerpts.map((ex) => {
          const dump = dumps.find((d) => d.id === ex.dumpId);
          return (
            <div
              key={ex.id}
              className="excerpt-card"
              style={{ "--ex-color": color } as React.CSSProperties}
            >
              {ex.text}
              <div className="source">
                <a onClick={() => openDump(ex.dumpId, ex.id)}>
                  ↩ {dump?.title ?? "unknown dump"}
                </a>
                <button className="small danger" onClick={() => deleteExcerpt(ex.id)}>
                  remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
