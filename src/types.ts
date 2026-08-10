export interface Dump {
  id: string;
  title: string;
  text: string;
  createdAt: string;
}

export interface Theme {
  id: string;
  label: string;
  description: string;
  position: { x: number; y: number };
  createdAt: string;
}

export interface ThemeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Excerpt {
  id: string;
  dumpId: string;
  themeId: string;
  text: string;
  note?: string;
  createdAt: string;
}

export interface AppState {
  dumps: Dump[];
  themes: Theme[];
  edges: ThemeEdge[];
  excerpts: Excerpt[];
}

export interface ExtractSuggestion {
  excerpt_text: string;
  existing_theme_id: string | null;
  new_theme_label: string | null;
  new_theme_description: string | null;
}
