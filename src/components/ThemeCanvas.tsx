import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useStore, themeColor } from "../store";
import ThemeNode, { type ThemeFlowNode } from "./ThemeNode";

const nodeTypes = { theme: ThemeNode };

function CanvasInner() {
  const themes = useStore((s) => s.themes);
  const storeEdges = useStore((s) => s.edges);
  const excerpts = useStore((s) => s.excerpts);
  const focusThemeId = useStore((s) => s.focusThemeId);
  const focusTheme = useStore((s) => s.focusTheme);
  const openTheme = useStore((s) => s.openTheme);
  const addTheme = useStore((s) => s.addTheme);
  const moveTheme = useStore((s) => s.moveTheme);
  const deleteTheme = useStore((s) => s.deleteTheme);
  const storeAddEdge = useStore((s) => s.addEdge);
  const deleteEdge = useStore((s) => s.deleteEdge);
  const setThemePositions = useStore((s) => s.setThemePositions);

  const { setCenter, screenToFlowPosition } = useReactFlow();

  const builtNodes: ThemeFlowNode[] = useMemo(
    () =>
      themes.map((t) => ({
        id: t.id,
        type: "theme" as const,
        position: t.position,
        data: {
          label: t.label,
          description: t.description,
          count: excerpts.filter((e) => e.themeId === t.id).length,
          color: themeColor(t.id, themes),
        },
      })),
    [themes, excerpts],
  );

  const builtEdges: Edge[] = useMemo(
    () =>
      storeEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      })),
    [storeEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<ThemeFlowNode>(builtNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(builtEdges);

  // Re-sync local flow state whenever the store changes (new themes, counts, etc.)
  useEffect(() => setNodes(builtNodes), [builtNodes, setNodes]);
  useEffect(() => setEdges(builtEdges), [builtEdges, setEdges]);

  // Pan to a node when something (dump viewer chip) asks for focus
  useEffect(() => {
    if (!focusThemeId) return;
    const t = themes.find((th) => th.id === focusThemeId);
    if (t) setCenter(t.position.x + 100, t.position.y + 40, { zoom: 1.1, duration: 500 });
    focusTheme(null);
  }, [focusThemeId, themes, setCenter, focusTheme]);

  const onConnect = useCallback(
    (conn: Connection) => {
      if (conn.source && conn.target) storeAddEdge(conn.source, conn.target);
    },
    [storeAddEdge],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => moveTheme(node.id, node.position),
    [moveTheme],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => deleted.forEach((n) => deleteTheme(n.id)),
    [deleteTheme],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => deleted.forEach((e) => deleteEdge(e.id)),
    [deleteEdge],
  );

  const createThemeAt = useCallback(
    (clientX: number, clientY: number) => {
      const label = window.prompt("New theme name:");
      if (!label?.trim()) return;
      const pos = screenToFlowPosition({ x: clientX, y: clientY });
      const theme = addTheme(label, "", pos);
      openTheme(theme.id);
    },
    [screenToFlowPosition, addTheme, openTheme],
  );

  const autoArrange = useCallback(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));
    themes.forEach((t) => g.setNode(t.id, { width: 200, height: 100 }));
    storeEdges.forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    const positions: Record<string, { x: number; y: number }> = {};
    themes.forEach((t) => {
      const n = g.node(t.id);
      if (n) positions[t.id] = { x: n.x - 100, y: n.y - 50 };
    });
    setThemePositions(positions);
  }, [themes, storeEdges, setThemePositions]);

  return (
    <div className="canvas-wrap">
      <div className="canvas-toolbar">
        <button
          className="small"
          onClick={(e) => createThemeAt(e.clientX + 200, e.clientY + 150)}
        >
          + Theme
        </button>
        <button className="small" onClick={autoArrange} disabled={themes.length === 0}>
          Auto-arrange
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onNodeClick={(_, node) => openTheme(node.id)}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains("react-flow__pane")) {
            createThemeAt(e.clientX, e.clientY);
          }
        }}
        zoomOnDoubleClick={false}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <div className="canvas-hint">
        Double-click empty space to add a theme · drag between nodes to connect · click a node to open it
      </div>
    </div>
  );
}

export default function ThemeCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
