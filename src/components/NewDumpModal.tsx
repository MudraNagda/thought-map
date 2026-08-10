import { useState } from "react";
import { useStore } from "../store";

export default function NewDumpModal({ onClose }: { onClose: () => void }) {
  const addDump = useStore((s) => s.addDump);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const save = () => {
    if (!text.trim()) return;
    addDump(title, text);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New thought dump</h2>
        <div className="row">
          <input
            placeholder="Title (optional — defaults to the first few words)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div className="row">
          <textarea
            placeholder="Paste or write your thought dump here… word vomit welcome."
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={save} disabled={!text.trim()}>
            Save dump
          </button>
        </div>
      </div>
    </div>
  );
}
