import {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeChange,
  OnNodesChange,
  ReactFlow,
  applyNodeChanges,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";

import { analyzeArchitecture, cleanupArchitectureLayout } from "../services/architectureEngine";
import { createBoard, getBoard, updateBoard } from "../services/boardApi";
import type { ArchitectureSuggestion, BoardElement, BoardElementType, BoardGraph } from "../types/board";

const nodeTypes: BoardElementType[] = [
  "client",
  "api-gateway",
  "service",
  "database",
  "cache",
  "queue",
  "external-api",
];

const initialGraph: BoardGraph = {
  elements: [
    createElement("client-1", "client", "Web Client", 80, 80),
    createElement("service-1", "service", "Order Service", 420, 180),
    createElement("service-2", "service", "Notification Worker", 720, 120),
    createElement("database-1", "database", "Orders DB", 520, 420),
  ],
  edges: [
    {
      id: "edge-client-service",
      sourceElementId: "client-1",
      targetElementId: "service-1",
    },
    {
      id: "edge-service-db",
      sourceElementId: "service-1",
      targetElementId: "database-1",
    },
  ],
};

const lastBoardStorageKey = "archflow:last-board-id";

export function BoardPage() {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState("Untitled Architecture");
  const [graph, setGraph] = useState<BoardGraph>(initialGraph);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ArchitectureSuggestion[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("Unsaved board");

  const nodes = useMemo(() => graph.elements.map(toFlowNode), [graph.elements]);
  const edges = useMemo(() => graph.edges.map(toFlowEdge), [graph.edges]);
  const selectedElement = graph.elements.find((element) => element.id === selectedElementId);

  useEffect(() => {
    const savedBoardId = localStorage.getItem(lastBoardStorageKey);

    if (!savedBoardId) {
      return;
    }

    setSaveStatus("loading");
    setStatusMessage("Loading saved board...");

    getBoard(savedBoardId)
      .then((board) => {
        setBoardId(board.id);
        setBoardName(board.name);
        setGraph({
          elements: board.elements,
          edges: board.edges,
        });
        setSaveStatus("saved");
        setStatusMessage("Loaded last saved board");
      })
      .catch(() => {
        localStorage.removeItem(lastBoardStorageKey);
        setSaveStatus("error");
        setStatusMessage("Could not load last board");
      });
  }, []);

  const handleNodesChange: OnNodesChange = (changes: NodeChange[]) => {
    const nextNodes = applyNodeChanges(changes, nodes);

    setGraph((currentGraph) => ({
      ...currentGraph,
      elements: currentGraph.elements.map((element) => {
        const matchingNode = nextNodes.find((node) => node.id === element.id);
        return matchingNode
          ? {
              ...element,
              position: matchingNode.position,
            }
          : element;
      }),
    }));

    if (hasUserNodeChange(changes)) {
      markUnsaved();
    }
  };

  const handleConnect = (connection: Connection) => {
    const nextEdge = addEdge(connection, edges).at(-1);

    if (!nextEdge || !connection.source || !connection.target) {
      return;
    }

    setGraph((currentGraph) => ({
      ...currentGraph,
      edges: [
        ...currentGraph.edges,
        {
          id: nextEdge.id,
          sourceElementId: connection.source,
          targetElementId: connection.target,
        },
      ],
    }));
    markUnsaved();
  };

  const addNode = (type: BoardElementType) => {
    const id = `${type}-${crypto.randomUUID()}`;
    setGraph((currentGraph) => ({
      ...currentGraph,
      elements: [
        ...currentGraph.elements,
        createElement(id, type, labelForType(type), 160 + currentGraph.elements.length * 24, 120),
      ],
    }));
    markUnsaved();
  };

  const handleCleanUp = () => {
    setGraph(cleanupArchitectureLayout(graph));
    markUnsaved();
  };

  const handleSaveBoard = async () => {
    setSaveStatus("saving");
    setStatusMessage("Saving...");

    try {
      const payload = {
        name: boardName.trim() || "Untitled Architecture",
        elements: graph.elements,
        edges: graph.edges,
      };

      const savedBoard = boardId
        ? await updateBoard(boardId, payload)
        : await createBoard(payload);

      setBoardId(savedBoard.id);
      setBoardName(savedBoard.name);
      setGraph({
        elements: savedBoard.elements,
        edges: savedBoard.edges,
      });
      localStorage.setItem(lastBoardStorageKey, savedBoard.id);
      setSaveStatus("saved");
      setStatusMessage("Saved");
    } catch (error) {
      setSaveStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Save failed");
    }
  };

  const updateSelectedElementLabel = (label: string) => {
    if (!selectedElementId) {
      return;
    }

    setGraph((currentGraph) => ({
      ...currentGraph,
      elements: currentGraph.elements.map((element) =>
        element.id === selectedElementId ? { ...element, label } : element,
      ),
    }));
    markUnsaved();
  };

  return (
    <main className="app-shell">
      <aside className="toolbar">
        <div>
          <p className="eyebrow">Architecture Board</p>
          <h1>Visual System Designer</h1>
        </div>

        <div className="tool-section">
          <span className="section-label">Board</span>
          <input
            aria-label="Board name"
            className="text-input"
            value={boardName}
            onChange={(event) => {
              setBoardName(event.target.value);
              markUnsaved();
            }}
          />
          <button
            type="button"
            className="primary-button"
            disabled={saveStatus === "saving" || saveStatus === "loading"}
            onClick={handleSaveBoard}
          >
            {saveStatus === "saving" ? "Saving..." : "Save Board"}
          </button>
          <p className={`status-text status-${saveStatus}`}>
            {statusMessage}
            {boardId ? ` (${shortBoardId(boardId)})` : ""}
          </p>
        </div>

        <div className="tool-section">
          <span className="section-label">Add Component</span>
          <div className="button-grid">
            {nodeTypes.map((type) => (
              <button key={type} type="button" onClick={() => addNode(type)}>
                {labelForType(type)}
              </button>
            ))}
          </div>
        </div>

        <div className="tool-section">
          <span className="section-label">Actions</span>
          <button type="button" onClick={handleCleanUp}>
            Clean Up
          </button>
          <button type="button" onClick={() => setSuggestions(analyzeArchitecture(graph))}>
            Analyze
          </button>
        </div>
      </aside>

      <section className="board-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onNodeClick={(_, node) => setSelectedElementId(node.id)}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </section>

      <aside className="context-panel">
        <section>
          <span className="section-label">Context Layer</span>
          {selectedElement ? (
            <div className="selected-card">
              <label className="field-group">
                <span>Component label</span>
                <input
                  aria-label="Selected component label"
                  className="text-input"
                  value={selectedElement.label}
                  onChange={(event) => updateSelectedElementLabel(event.target.value)}
                />
              </label>
              <span>{labelForType(selectedElement.type)}</span>
              <textarea placeholder="Add implementation notes, API details, links, or code context..." />
            </div>
          ) : (
            <p className="muted">Select a component to attach notes and execution context.</p>
          )}
        </section>

        <section>
          <span className="section-label">Architecture Assist</span>
          {suggestions.length > 0 ? (
            <div className="suggestions">
              {suggestions.map((suggestion) => (
                <article key={suggestion.id} className="suggestion-card">
                  <span>{suggestion.severity}</span>
                  <strong>{suggestion.title}</strong>
                  <p>{suggestion.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Run Analyze to get system design suggestions.</p>
          )}
        </section>
      </aside>
    </main>
  );

  function markUnsaved() {
    if (saveStatus !== "loading" && saveStatus !== "saving") {
      setSaveStatus("idle");
      setStatusMessage(boardId ? "Unsaved changes" : "Unsaved board");
    }
  }
}

function createElement(
  id: string,
  type: BoardElementType,
  label: string,
  x: number,
  y: number,
): BoardElement {
  return {
    id,
    type,
    label,
    position: { x, y },
    size: { width: 180, height: 64 },
  };
}

function toFlowNode(element: BoardElement): Node {
  return {
    id: element.id,
    type: "default",
    position: element.position,
    data: {
      label: `${labelForType(element.type)}: ${element.label}`,
    },
    style: {
      width: element.size.width,
      borderRadius: 8,
      border: "1px solid #b7c3d8",
      background: "#ffffff",
      color: "#172033",
      fontWeight: 600,
    },
  };
}

function toFlowEdge(edge: { id: string; sourceElementId: string; targetElementId: string }): Edge {
  return {
    id: edge.id,
    source: edge.sourceElementId,
    target: edge.targetElementId,
    animated: true,
  };
}

function labelForType(type: BoardElementType): string {
  const labels: Record<BoardElementType, string> = {
    "api-gateway": "API Gateway",
    cache: "Cache",
    client: "Client",
    database: "Database",
    "external-api": "External API",
    "load-balancer": "Load Balancer",
    queue: "Queue",
    service: "Service",
    text: "Text",
  };

  return labels[type];
}

function shortBoardId(boardId: string): string {
  return boardId.slice(0, 8);
}

function hasUserNodeChange(changes: NodeChange[]): boolean {
  return changes.some((change) => change.type === "position" || change.type === "remove");
}
