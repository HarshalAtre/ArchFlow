import {
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeChange,
  ReactFlow,
} from "@xyflow/react";

type BoardCanvasProps = {
  edges: Edge[];
  nodes: Node[];
  onConnect: (connection: Connection) => void;
  onNodeSelect: (nodeId: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
};

export function BoardCanvas({
  edges,
  nodes,
  onConnect,
  onNodeSelect,
  onNodesChange,
}: BoardCanvasProps) {
  return (
    <section className="board-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeSelect(node.id)}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </section>
  );
}
