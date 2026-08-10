import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, themeColor } from "../store";
import AssignPopover from "./AssignPopover";
import ExtractReview from "./ExtractReview";
import { extractThemes } from "../api";
import type { ExtractSuggestion } from "../types";

interface Props {
  dumpId: string;
  highlightExcerptId?: string;
}

interface Segment {
  text: string;
  excerptId?: string;
  themeId?: string;
}

export default function DumpViewer({ dumpId, highlightExcerptId }: Props) {
  const dump = useStore((s) => s.dumps.find((d) => d.id === dumpId));
  const themes = useStore((s) => s.themes);
  const excerpts = useStore((s) => s.excerpts);
  const aiEnabled = useStore((s) => s.aiEnabled);
  const closePanel = useStore((s) => s.closePanel);
  const deleteDump = useStore((s) => s.deleteDump);
  const addExcerpt = useStore((s) => s.addExcerpt);
  const addTheme = useStore((s) => s.addTheme);
  const openTheme = useStore((s) => s.openTheme);
  const focusTheme = useStore((s) => s.focusTheme);

  const textRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [suggestions, setSuggestions] = useState<ExtractSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dumpExcerpts = useMemo(
    () => excerpts.filter((e) => e.dumpId === dumpId),
    [excerpts, dumpId],
  );

  // Split the dump text into plain/highlighted segments by locating each
  // excerpt's verbatim text (first non-overlapping occurrence).
  const segments: Segment[] = useMemo(() => {
    if (!dump) return [];
    const ranges: { start: number; end: number; excerptId: string; themeId: string }[] = [];
    for (const ex of dumpExcerpts) {
      if (!ex.text) continue;
      let from = 0;
      while (from < dump.text.length) {
        const idx = dump.text.indexOf(ex.text, from);
        if (idx === -1) break;
        const end = idx + ex.text.length;
        const overlaps = ranges.some((r) => idx < r.end && end > r.start);
        if (!overlaps) {
          ranges.push({ start: idx, end, excerptId: ex.id, themeId: ex.themeId });
          break;
        }
        from = idx + 1;
      }
    }
    ranges.sort((a, b) => a.start - b.start);
    const segs: Segment[] = [];
    let cursor = 0;
    for (const r of ranges) {
      if (r.start > cursor) segs.push({ text: dump.text.slice(cursor, r.start) });
      segs.push({
        text: dump.text.slice(r.start, r.end),
        excerptId: r.excerptId,
        themeId: r.themeId,
      });
      cursor = r.end;
    }
    if (dump && cursor < dump.text.length) segs.push({ text: dump.text.slice(cursor) });
    return segs;
  }, [dump, dumpExcerpts]);

  const distributedThemes = useMemo(() => {
    const ids = [...new Set(dumpExcerpts.map((e) => e.themeId))];
    return ids
      .map((id) => themes.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [dumpExcerpts, themes]);

  // Scroll to + flash a specific excerpt when opened via a theme panel back-link
  useEffect(() => {
    if (!highlightExcerptId) return;
    const el = textRef.current?.querySelector(`[data-excerpt="${highlightExcerptId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("flash");
      const t = setTimeout(() => el.classList.remove("flash"), 2000);
      return () => clearTimeout(t);
    }
  }, [highlightExcerptId, segments]);

  const onMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !textRef.current) return;
    if (!textRef.current.contains(sel.anchorNode)) return;
    const text = sel.toString().trim();
    if (text.length < 3) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setPopover({ x: rect.left, y: rect.bottom + 6, text });
  };

  const assignTo = (themeId: string) => {
    if (!popover) return;
    addExcerpt(dumpId, themeId, popover.text);
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  const createAndAssign = (label: string) => {
    const theme = addTheme(label);
    if (popover) addExcerpt(dumpId, theme.id, popover.text);
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  const runExtract = async () => {
    if (!dump) return;
    setExtracting(true);
    setError(null);
    try {
      const result = await extractThemes(dump.text, themes);
      setSuggestions(result.suggestions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  };

  if (!dump) return null;

  return (
    <aside className="panel">
      <div className="panel-header">
        <div className="title" title={dump.title}>{dump.title}</div>
        {aiEnabled && (
          <button className="small" onClick={runExtract} disabled={extracting}>
            {extracting ? "Extracting…" : "✨ Auto-extract"}
          </button>
        )}
        <button
          className="small danger"
          onClick={() => {
            if (confirm("Delete this dump and its excerpt assignments?")) deleteDump(dumpId);
          }}
        >
          Delete
        </button>
        <button className="small" onClick={closePanel}>✕</button>
      </div>
      <div className="panel-body">
        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <div className="dump-text" ref={textRef} onMouseUp={onMouseUp}>
          {segments.map((seg, i) =>
            seg.excerptId ? (
              <mark
                key={i}
                data-excerpt={seg.excerptId}
                style={{ "--hl-color": themeColor(seg.themeId!, themes) } as React.CSSProperties}
                title={themes.find((t) => t.id === seg.themeId)?.label}
                onClick={() => openTheme(seg.themeId!)}
              >
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </div>

        <div className="section-title">Distributed to</div>
        {distributedThemes.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#6b7280" }}>
            Nothing yet — select a passage above to assign it to a theme.
          </div>
        ) : (
          <div className="chip-row">
            {distributedThemes.map((t) => (
              <button
                key={t.id}
                className="theme-chip"
                style={{ "--chip-color": themeColor(t.id, themes) } as React.CSSProperties}
                onClick={() => {
                  focusTheme(t.id);
                  openTheme(t.id);
                }}
              >
                {t.label} · {dumpExcerpts.filter((e) => e.themeId === t.id).length}
              </button>
            ))}
          </div>
        )}
      </div>

      {popover && (
        <AssignPopover
          x={popover.x}
          y={popover.y}
          onAssign={assignTo}
          onCreate={createAndAssign}
          onClose={() => setPopover(null)}
        />
      )}
      {suggestions && (
        <ExtractReview
          dumpId={dumpId}
          suggestions={suggestions}
          onClose={() => setSuggestions(null)}
        />
      )}
    </aside>
  );
}
