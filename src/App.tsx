import { useEffect, useState } from "react";
import { useStore } from "./store";
import DumpSidebar from "./components/DumpSidebar";
import ThemeCanvas from "./components/ThemeCanvas";
import DumpViewer from "./components/DumpViewer";
import ThemePanel from "./components/ThemePanel";
import NewDumpModal from "./components/NewDumpModal";

export default function App() {
  const loaded = useStore((s) => s.loaded);
  const load = useStore((s) => s.load);
  const panel = useStore((s) => s.panel);
  const [showNewDump, setShowNewDump] = useState(false);

  useEffect(() => {
    load().catch((err) => console.error(err));
  }, [load]);

  if (!loaded) {
    return <div style={{ padding: 40, color: "#6b7280" }}>Loading…</div>;
  }

  const hasPanel = panel.kind !== "none";

  return (
    <div className={`app${hasPanel ? " with-panel" : ""}`}>
      <DumpSidebar onNewDump={() => setShowNewDump(true)} />
      <ThemeCanvas />
      {panel.kind === "dump" && <DumpViewer key={panel.dumpId} dumpId={panel.dumpId} highlightExcerptId={panel.highlightExcerptId} />}
      {panel.kind === "theme" && <ThemePanel key={panel.themeId} themeId={panel.themeId} />}
      {showNewDump && <NewDumpModal onClose={() => setShowNewDump(false)} />}
    </div>
  );
}
