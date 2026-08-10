import { create } from "zustand";
import type { AppState, Dump, Excerpt, Theme, ThemeEdge } from "./types";
import { fetchConfig, fetchState, saveState } from "./api";

const uid = () => Math.random().toString(36).slice(2, 10);

// Debounced persistence: any data mutation schedules a save of the full state.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(get: () => Store) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { dumps, themes, edges, excerpts } = get();
    saveState({ dumps, themes, edges, excerpts }).catch((err) =>
      console.error("save failed:", err),
    );
  }, 400);
}

export type PanelView =
  | { kind: "none" }
  | { kind: "dump"; dumpId: string; highlightExcerptId?: string }
  | { kind: "theme"; themeId: string };

interface Store extends AppState {
  loaded: boolean;
  aiEnabled: boolean;
  panel: PanelView;
  focusThemeId: string | null; // canvas pans to this node when set

  load: () => Promise<void>;
  openDump: (dumpId: string, highlightExcerptId?: string) => void;
  openTheme: (themeId: string) => void;
  closePanel: () => void;
  focusTheme: (themeId: string | null) => void;

  addDump: (title: string, text: string) => Dump;
  deleteDump: (dumpId: string) => void;
  addTheme: (label: string, description?: string, position?: { x: number; y: number }) => Theme;
  updateTheme: (themeId: string, patch: Partial<Pick<Theme, "label" | "description">>) => void;
  moveTheme: (themeId: string, position: { x: number; y: number }) => void;
  deleteTheme: (themeId: string) => void;
  addEdge: (source: string, target: string) => void;
  deleteEdge: (edgeId: string) => void;
  addExcerpt: (dumpId: string, themeId: string, text: string) => void;
  deleteExcerpt: (excerptId: string) => void;
  setThemePositions: (positions: Record<string, { x: number; y: number }>) => void;
}

export const useStore = create<Store>((set, get) => ({
  dumps: [],
  themes: [],
  edges: [],
  excerpts: [],
  loaded: false,
  aiEnabled: false,
  panel: { kind: "none" },
  focusThemeId: null,

  load: async () => {
    const [state, config] = await Promise.all([fetchState(), fetchConfig()]);
    set({ ...state, aiEnabled: config.aiEnabled, loaded: true });
  },

  openDump: (dumpId, highlightExcerptId) =>
    set({ panel: { kind: "dump", dumpId, highlightExcerptId } }),
  openTheme: (themeId) => set({ panel: { kind: "theme", themeId } }),
  closePanel: () => set({ panel: { kind: "none" } }),
  focusTheme: (themeId) => set({ focusThemeId: themeId }),

  addDump: (title, text) => {
    const trimmed = text.trim();
    const dump: Dump = {
      id: uid(),
      title: title.trim() || trimmed.split(/\s+/).slice(0, 6).join(" "),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ dumps: [dump, ...s.dumps], panel: { kind: "dump", dumpId: dump.id } }));
    scheduleSave(get);
    return dump;
  },

  deleteDump: (dumpId) => {
    set((s) => ({
      dumps: s.dumps.filter((d) => d.id !== dumpId),
      excerpts: s.excerpts.filter((e) => e.dumpId !== dumpId),
      panel: s.panel.kind === "dump" && s.panel.dumpId === dumpId ? { kind: "none" } : s.panel,
    }));
    scheduleSave(get);
  },

  addTheme: (label, description = "", position) => {
    const existing = get().themes;
    const theme: Theme = {
      id: uid(),
      label: label.trim(),
      description,
      position: position ?? {
        x: 80 + (existing.length % 4) * 240,
        y: 80 + Math.floor(existing.length / 4) * 160,
      },
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ themes: [...s.themes, theme] }));
    scheduleSave(get);
    return theme;
  },

  updateTheme: (themeId, patch) => {
    set((s) => ({
      themes: s.themes.map((t) => (t.id === themeId ? { ...t, ...patch } : t)),
    }));
    scheduleSave(get);
  },

  moveTheme: (themeId, position) => {
    set((s) => ({
      themes: s.themes.map((t) => (t.id === themeId ? { ...t, position } : t)),
    }));
    scheduleSave(get);
  },

  deleteTheme: (themeId) => {
    set((s) => ({
      themes: s.themes.filter((t) => t.id !== themeId),
      edges: s.edges.filter((e) => e.source !== themeId && e.target !== themeId),
      excerpts: s.excerpts.filter((e) => e.themeId !== themeId),
      panel: s.panel.kind === "theme" && s.panel.themeId === themeId ? { kind: "none" } : s.panel,
    }));
    scheduleSave(get);
  },

  addEdge: (source, target) => {
    if (source === target) return;
    const dup = get().edges.some(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source),
    );
    if (dup) return;
    const edge: ThemeEdge = { id: uid(), source, target };
    set((s) => ({ edges: [...s.edges, edge] }));
    scheduleSave(get);
  },

  deleteEdge: (edgeId) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) }));
    scheduleSave(get);
  },

  addExcerpt: (dumpId, themeId, text) => {
    const excerpt: Excerpt = {
      id: uid(),
      dumpId,
      themeId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ excerpts: [...s.excerpts, excerpt] }));
    scheduleSave(get);
  },

  deleteExcerpt: (excerptId) => {
    set((s) => ({ excerpts: s.excerpts.filter((e) => e.id !== excerptId) }));
    scheduleSave(get);
  },

  setThemePositions: (positions) => {
    set((s) => ({
      themes: s.themes.map((t) =>
        positions[t.id] ? { ...t, position: positions[t.id] } : t,
      ),
    }));
    scheduleSave(get);
  },
}));

// Stable color per theme for highlights and node accents.
const PALETTE = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#14b8a6", "#f97316", "#ec4899", "#84cc16",
];
export function themeColor(themeId: string, themes: Theme[]): string {
  const idx = themes.findIndex((t) => t.id === themeId);
  return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
}
