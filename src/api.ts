import type { AppState, ExtractSuggestion, Theme } from "./types";

export async function fetchState(): Promise<AppState> {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error("Failed to load state");
  return res.json();
}

export async function saveState(state: AppState): Promise<void> {
  const res = await fetch("/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!res.ok) throw new Error("Failed to save state");
}

export async function fetchConfig(): Promise<{ aiEnabled: boolean }> {
  const res = await fetch("/api/config");
  if (!res.ok) return { aiEnabled: false };
  return res.json();
}

export async function extractThemes(
  dumpText: string,
  themes: Theme[],
): Promise<{ suggestions: ExtractSuggestion[] }> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dumpText,
      themes: themes.map((t) => ({ id: t.id, label: t.label, description: t.description })),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Extraction failed");
  }
  return res.json();
}
