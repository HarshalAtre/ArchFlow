import {
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  Handle,
  MiniMap,
  Node,
  NodeChange,
  NodeProps,
  NodeTypes,
  Position,
  ReactFlow,
} from "@xyflow/react";

type ArchitectureNodeData = {
  contextBadges: string[];
  elementType: string;
  label: string;
};

type ArchitectureNode = Node<ArchitectureNodeData, "architecture">;

const customNodeTypes: NodeTypes = {
  architecture: ArchitectureBoardNode,
};

type BoardCanvasProps = {
  edges: Edge[];
  nodes: Node[];
  onConnect: (connection: Connection) => void;
  onEdgeSelect: (edgeId: string) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeSelect: (nodeId: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onSelectionClear: () => void;
};

export function BoardCanvas({
  edges,
  nodes,
  onConnect,
  onEdgeSelect,
  onEdgesChange,
  onNodeSelect,
  onNodesChange,
  onSelectionClear,
}: BoardCanvasProps) {
  return (
    <section className="board-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        onEdgeClick={(_, edge) => onEdgeSelect(edge.id)}
        onPaneClick={onSelectionClear}
        nodeTypes={customNodeTypes}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </section>
  );
}

function ArchitectureBoardNode({ data, selected }: NodeProps<ArchitectureNode>) {
  return (
    <div className={`architecture-node ${selected ? "architecture-node-selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className="architecture-node-type">{data.elementType}</div>
      <div className="architecture-node-label">{data.label}</div>
      {data.contextBadges.length > 0 ? (
        <div className="architecture-node-badges">
          {data.contextBadges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
