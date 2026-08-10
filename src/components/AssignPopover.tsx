import { useEffect, useRef, useState } from "react";
import { useStore, themeColor } from "../store";

interface Props {
  x: number;
  y: number;
  onAssign: (themeId: string) => void;
  onCreate: (label: string) => void;
  onClose: () => void;
}

export default function AssignPopover({ x, y, onAssign, onCreate, onClose }: Props) {
  const themes = useStore((s) => s.themes);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const filtered = themes.filter((t) =>
    t.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const exactMatch = themes.some(
    (t) => t.label.toLowerCase() === query.trim().toLowerCase(),
  );

  // Keep the popover on screen
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 300),
    top: Math.min(y, window.innerHeight - 320),
  };

  return (
    <div className="assign-popover" style={style} ref={ref}>
      <input
        autoFocus
        placeholder="Assign to theme… (type to search or create)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter") {
            if (filtered.length > 0 && (exactMatch || !query.trim())) {
              onAssign(filtered[0].id);
            } else if (query.trim()) {
              onCreate(query.trim());
            }
          }
        }}
      />
      <div className="options">
        {filtered.map((t) => (
          <div key={t.id} className="assign-option" onClick={() => onAssign(t.id)}>
            <span className="dot" style={{ background: themeColor(t.id, themes) }} />
            {t.label}
          </div>
        ))}
        {query.trim() && !exactMatch && (
          <div className="assign-option create" onClick={() => onCreate(query.trim())}>
            + Create theme “{query.trim()}”
          </div>
        )}
        {themes.length === 0 && !query.trim() && (
          <div className="assign-option" style={{ color: "#6b7280", cursor: "default" }}>
            No themes yet — type a name to create one
          </div>
        )}
      </div>
    </div>
  );
}
