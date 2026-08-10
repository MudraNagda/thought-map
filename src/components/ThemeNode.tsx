import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export type ThemeNodeData = {
  label: string;
  description: string;
  count: number;
  color: string;
};

export type ThemeFlowNode = Node<ThemeNodeData, "theme">;

export default function ThemeNode({ data, selected }: NodeProps<ThemeFlowNode>) {
  return (
    <div
      className={`theme-node${selected ? " selected" : ""}`}
      style={{ "--node-color": data.color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Left} />
      <div className="label">{data.label}</div>
      {data.description && <div className="desc">{data.description}</div>}
      <div className="count">
        {data.count} excerpt{data.count === 1 ? "" : "s"}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
