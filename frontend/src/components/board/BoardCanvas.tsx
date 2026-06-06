import {
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  Node,
  NodeChange,
  ReactFlow,
} from "@xyflow/react";

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
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </section>
  );
}
