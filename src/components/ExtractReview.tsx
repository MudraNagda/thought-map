import { useState } from "react";
import { useStore } from "../store";
import type { ExtractSuggestion } from "../types";

interface Props {
  dumpId: string;
  suggestions: ExtractSuggestion[];
  onClose: () => void;
}

export default function ExtractReview({ dumpId, suggestions, onClose }: Props) {
  const themes = useStore((s) => s.themes);
  const addTheme = useStore((s) => s.addTheme);
  const addExcerpt = useStore((s) => s.addExcerpt);
  const [remaining, setRemaining] = useState(suggestions);

  const accept = (sug: ExtractSuggestion) => {
    let themeId = sug.existing_theme_id ?? undefined;
    if (themeId && !themes.some((t) => t.id === themeId)) themeId = undefined;
    if (!themeId) {
      const label = sug.new_theme_label?.trim() || "Untitled theme";
      // Reuse a theme with the same label if one exists (also dedupes repeated
      // new-theme suggestions within this batch, since accepts are sequential).
      const existing = useStore
        .getState()
        .themes.find((t) => t.label.toLowerCase() === label.toLowerCase());
      themeId = existing?.id ?? addTheme(label, sug.new_theme_description ?? "").id;
    }
    addExcerpt(dumpId, themeId, sug.excerpt_text);
    setRemaining((r) => r.filter((s) => s !== sug));
  };

  const reject = (sug: ExtractSuggestion) => {
    setRemaining((r) => r.filter((s) => s !== sug));
  };

  if (remaining.length === 0) {
    onClose();
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Suggested theme assignments ({remaining.length})</h2>
        {remaining.map((sug, i) => {
          const existing = sug.existing_theme_id
            ? themes.find((t) => t.id === sug.existing_theme_id)
            : null;
          return (
            <div key={i} className="suggestion">
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>“{sug.excerpt_text}”</div>
              <div className="target">
                {existing ? (
                  <>→ existing theme <b>{existing.label}</b></>
                ) : (
                  <>→ new theme <b>{sug.new_theme_label}</b>
                    {sug.new_theme_description ? ` — ${sug.new_theme_description}` : ""}</>
                )}
              </div>
              <div className="actions">
                <button className="small primary" onClick={() => accept(sug)}>Accept</button>
                <button className="small" onClick={() => reject(sug)}>Skip</button>
              </div>
            </div>
          );
        })}
        <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose}>Close</button>
          <button className="primary" onClick={() => { [...remaining].forEach(accept); }}>
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
