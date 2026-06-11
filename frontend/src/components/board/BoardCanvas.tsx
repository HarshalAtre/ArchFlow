import {
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  EdgeLabelRenderer,
  EdgeProps,
  EdgeTypes,
  Handle,
  MiniMap,
  Node,
  NodeChange,
  NodeProps,
  NodeTypes,
  Position,
  ReactFlow,
  getBezierPath,
} from "@xyflow/react";
import { useEffect } from "react";

type ArchitectureNodeData = {
  contextBadges: string[];
  elementType: string;
  label: string;
  onSelect?: (nodeId: string) => void;
};

type ArchitectureNode = Node<ArchitectureNodeData, "architecture">;
type ArchitectureEdgeData = {
  onDelete?: (edgeId: string) => void;
  onSelect?: (edgeId: string) => void;
};
type ArchitectureEdge = Edge<ArchitectureEdgeData, "architecture">;

const customNodeTypes: NodeTypes = {
  architecture: ArchitectureBoardNode,
};

const customEdgeTypes: EdgeTypes = {
  architecture: ArchitectureBoardEdge,
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
  useEffect(() => {
    const selectNodeFromPointer = (event: PointerEvent) => {
      const targetElement = document.elementFromPoint(event.clientX, event.clientY);
      const boardElement = targetElement?.closest(".board-canvas");
      const nodeId = nodeIdAtPoint(event.clientX, event.clientY);

      if (boardElement && nodeId) {
        onNodeSelect(nodeId);
      }
    };

    document.addEventListener("pointerdown", selectNodeFromPointer, { capture: true });
    return () => document.removeEventListener("pointerdown", selectNodeFromPointer, { capture: true });
  }, [onNodeSelect]);

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
        onPaneClick={(event) => {
          const target = event.target as Element;

          if (
            target.closest(".react-flow__node, .react-flow__edge, .edge-remove-button") ||
            nodeIdAtPoint(event.clientX, event.clientY)
          ) {
            return;
          }

          onSelectionClear();
        }}
        edgeTypes={customEdgeTypes}
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

function nodeIdAtPoint(x: number, y: number): string | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(".react-flow__node[data-id]"));
  const matchingNode = nodes.find((node) => {
    const rect = node.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });

  return matchingNode?.dataset.id ?? null;
}

function ArchitectureBoardNode({ data, dragging, id, selected }: NodeProps<ArchitectureNode>) {
  return (
    <div
      className={[
        "architecture-node",
        selected ? "architecture-node-selected" : "",
        dragging ? "architecture-node-dragging" : "",
      ].join(" ")}
      onClick={(event) => {
        event.stopPropagation();
        data.onSelect?.(id);
      }}
      onPointerDownCapture={() => data.onSelect?.(id)}
      onPointerDown={() => data.onSelect?.(id)}
    >
      <Handle className="architecture-node-handle" type="target" position={Position.Left} />
      <div className="architecture-node-type">{data.elementType}</div>
      <div className="architecture-node-label">{data.label}</div>
      {data.contextBadges.length > 0 ? (
        <div className="architecture-node-badges">
          {data.contextBadges.map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      ) : null}
      <Handle className="architecture-node-handle" type="source" position={Position.Right} />
    </div>
  );
}

function ArchitectureBoardEdge({
  id,
  data,
  markerEnd,
  selected,
  style,
  ...edgeProps
}: EdgeProps<ArchitectureEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath(edgeProps);

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        style={style}
        markerEnd={markerEnd}
      />
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={28}
        onPointerDown={(event) => {
          event.stopPropagation();
          data?.onSelect?.(id);
        }}
      />
      {selected && data?.onDelete ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="edge-remove-button"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onClick={(event) => {
              event.stopPropagation();
              data.onDelete?.(id);
            }}
          >
            Remove
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
