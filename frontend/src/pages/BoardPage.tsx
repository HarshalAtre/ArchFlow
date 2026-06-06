import {
  addEdge,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnNodesChange,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";

import { ArchitectureAssistPanel } from "../components/board/ArchitectureAssistPanel";
import { BoardCanvas } from "../components/board/BoardCanvas";
import { BoardToolbar } from "../components/board/BoardToolbar";
import { ContextPanel } from "../components/board/ContextPanel";
import { labelForType } from "../components/board/boardLabels";
import { analyzeArchitecture, cleanupArchitectureLayout } from "../services/architectureEngine";
import { createBoard, getBoard, updateBoard } from "../services/boardApi";
import type {
  ArchitectureSuggestion,
  BoardEdge,
  BoardElement,
  BoardElementType,
  BoardGraph,
  Position,
} from "../types/board";

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
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ArchitectureSuggestion[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("Unsaved board");

  const nodes = useMemo(() => graph.elements.map(toFlowNode), [graph.elements]);
  const edges = useMemo(() => graph.edges.map(toFlowEdge), [graph.edges]);
  const selectedElement = graph.elements.find((element) => element.id === selectedElementId);
  const selectedEdge = graph.edges.find((edge) => edge.id === selectedEdgeId);
  const selectedEdgeDetails = selectedEdge
    ? {
        id: selectedEdge.id,
        sourceLabel: elementLabelForId(graph, selectedEdge.sourceElementId),
        targetLabel: elementLabelForId(graph, selectedEdge.targetElementId),
      }
    : undefined;

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
    const nextNodeIds = new Set(nextNodes.map((node) => node.id));

    setGraph((currentGraph) => ({
      ...currentGraph,
      elements: currentGraph.elements
        .filter((element) => nextNodeIds.has(element.id))
        .map((element) => {
          const matchingNode = nextNodes.find((node) => node.id === element.id);
          return matchingNode
            ? {
                ...element,
                position: matchingNode.position,
              }
            : element;
        }),
      edges: currentGraph.edges.filter(
        (edge) => nextNodeIds.has(edge.sourceElementId) && nextNodeIds.has(edge.targetElementId),
      ),
    }));

    if (hasUserNodeChange(changes)) {
      if (selectedElementId && !nextNodeIds.has(selectedElementId)) {
        setSelectedElementId(null);
      }
      markUnsaved();
    }
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    const nextEdges = applyEdgeChanges(changes, edges);
    const nextEdgeIds = new Set(nextEdges.map((edge) => edge.id));

    setGraph((currentGraph) => ({
      ...currentGraph,
      edges: currentGraph.edges.filter((edge) => nextEdgeIds.has(edge.id)),
    }));

    if (changes.some((change) => change.type === "remove")) {
      if (selectedEdgeId && !nextEdgeIds.has(selectedEdgeId)) {
        setSelectedEdgeId(null);
      }
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
    addElement(type, labelForType(type));
    markUnsaved();
  };

  const addElement = (type: BoardElementType, label: string) => {
    const id = `${type}-${crypto.randomUUID()}`;
    setGraph((currentGraph) => ({
      ...currentGraph,
      elements: [
        ...currentGraph.elements,
        createElement(id, type, label, 160 + currentGraph.elements.length * 24, 120),
      ],
    }));
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) {
      return;
    }

    setGraph((currentGraph) => ({
      elements: currentGraph.elements.filter((element) => element.id !== selectedElementId),
      edges: currentGraph.edges.filter(
        (edge) => edge.sourceElementId !== selectedElementId && edge.targetElementId !== selectedElementId,
      ),
    }));
    setSelectedElementId(null);
    markUnsaved();
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) {
      return;
    }

    setGraph((currentGraph) => ({
      ...currentGraph,
      edges: currentGraph.edges.filter((edge) => edge.id !== selectedEdgeId),
    }));
    setSelectedEdgeId(null);
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

  const updateSelectedElementNotes = (notes: string) => {
    if (!selectedElementId) {
      return;
    }

    setGraph((currentGraph) => ({
      ...currentGraph,
      elements: currentGraph.elements.map((element) =>
        element.id === selectedElementId
          ? {
              ...element,
              metadata: {
                ...element.metadata,
                notes,
              },
            }
          : element,
      ),
    }));
    markUnsaved();
  };

  const applySuggestion = (suggestion: ArchitectureSuggestion) => {
    if (!suggestion.suggestedElementType) {
      return;
    }

    const nextGraph = applyArchitectureSuggestion(graph, suggestion);
    setGraph(nextGraph);
    setSuggestions(analyzeArchitecture(nextGraph));
    markUnsaved();
  };

  return (
    <main className="app-shell">
      <BoardToolbar
        boardId={boardId}
        boardName={boardName}
        nodeTypes={nodeTypes}
        saveStatus={saveStatus}
        statusMessage={statusMessage}
        onAddNode={addNode}
        onAnalyze={() => setSuggestions(analyzeArchitecture(graph))}
        onBoardNameChange={(name) => {
          setBoardName(name);
          markUnsaved();
        }}
        onCleanUp={handleCleanUp}
        onSaveBoard={handleSaveBoard}
      />

      <BoardCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onEdgeSelect={(edgeId) => {
          setSelectedEdgeId(edgeId);
          setSelectedElementId(null);
        }}
        onNodeSelect={(nodeId) => {
          setSelectedElementId(nodeId);
          setSelectedEdgeId(null);
        }}
        onSelectionClear={() => {
          setSelectedElementId(null);
          setSelectedEdgeId(null);
        }}
      />

      <aside className="context-panel">
        <ContextPanel
          selectedEdge={selectedEdgeDetails}
          selectedElement={selectedElement}
          onDeleteEdge={deleteSelectedEdge}
          onDeleteElement={deleteSelectedElement}
          onLabelChange={updateSelectedElementLabel}
          onNotesChange={updateSelectedElementNotes}
        />
        <ArchitectureAssistPanel suggestions={suggestions} onApplySuggestion={applySuggestion} />
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

function hasUserNodeChange(changes: NodeChange[]): boolean {
  return changes.some((change) => change.type === "position" || change.type === "remove");
}

function applyArchitectureSuggestion(
  graph: BoardGraph,
  suggestion: ArchitectureSuggestion,
): BoardGraph {
  if (!suggestion.suggestedElementType) {
    return graph;
  }

  const suggestedElement = createElement(
    `${suggestion.suggestedElementType}-${crypto.randomUUID()}`,
    suggestion.suggestedElementType,
    labelForType(suggestion.suggestedElementType),
    suggestedPositionForType(graph, suggestion.suggestedElementType).x,
    suggestedPositionForType(graph, suggestion.suggestedElementType).y,
  );

  return {
    elements: [...graph.elements, suggestedElement],
    edges: [...graph.edges, ...suggestedEdgesForElement(graph, suggestedElement, suggestion)],
  };
}

function suggestedPositionForType(graph: BoardGraph, type: BoardElementType): Position {
  const layerTypes = layerTypesFor(type);
  const siblingsInLayer = graph.elements.filter((element) => layerTypes.includes(element.type));

  return {
    x: 160 + siblingsInLayer.length * 220,
    y: layerYFor(type),
  };
}

function suggestedEdgesForElement(
  graph: BoardGraph,
  suggestedElement: BoardElement,
  suggestion: ArchitectureSuggestion,
): BoardEdge[] {
  const relatedElements = graph.elements.filter((element) =>
    suggestion.relatedElementIds.includes(element.id),
  );
  const clients = relatedElements.filter((element) => element.type === "client");
  const services = relatedElements.filter((element) => element.type === "service");
  const databases = relatedElements.filter((element) => element.type === "database");
  const newEdges: BoardEdge[] = [];

  const addSuggestedEdge = (sourceElementId: string, targetElementId: string) => {
    const alreadyExists = [...graph.edges, ...newEdges].some(
      (edge) => edge.sourceElementId === sourceElementId && edge.targetElementId === targetElementId,
    );

    if (!alreadyExists) {
      newEdges.push({
        id: `edge-${sourceElementId}-${targetElementId}-${crypto.randomUUID()}`,
        sourceElementId,
        targetElementId,
      });
    }
  };

  if (suggestedElement.type === "api-gateway" || suggestedElement.type === "load-balancer") {
    for (const client of clients) {
      addSuggestedEdge(client.id, suggestedElement.id);
    }

    for (const service of services) {
      addSuggestedEdge(suggestedElement.id, service.id);
    }
  }

  if (suggestedElement.type === "database") {
    for (const service of services) {
      addSuggestedEdge(service.id, suggestedElement.id);
    }
  }

  if (suggestedElement.type === "cache") {
    for (const service of services) {
      addSuggestedEdge(service.id, suggestedElement.id);
    }

    for (const database of databases) {
      addSuggestedEdge(suggestedElement.id, database.id);
    }
  }

  if (suggestedElement.type === "queue") {
    for (const service of services) {
      addSuggestedEdge(service.id, suggestedElement.id);
    }
  }

  return newEdges;
}

function elementLabelForId(graph: BoardGraph, elementId: string): string {
  const element = graph.elements.find((currentElement) => currentElement.id === elementId);
  return element ? element.label : elementId;
}

function layerTypesFor(type: BoardElementType): BoardElementType[] {
  if (type === "client") {
    return ["client"];
  }

  if (type === "api-gateway" || type === "load-balancer") {
    return ["api-gateway", "load-balancer"];
  }

  if (type === "service") {
    return ["service"];
  }

  if (type === "cache" || type === "queue" || type === "database") {
    return ["cache", "queue", "database"];
  }

  if (type === "external-api") {
    return ["external-api"];
  }

  return ["text"];
}

function layerYFor(type: BoardElementType): number {
  if (type === "client") {
    return 80;
  }

  if (type === "api-gateway" || type === "load-balancer") {
    return 220;
  }

  if (type === "service") {
    return 360;
  }

  if (type === "cache" || type === "queue" || type === "database") {
    return 520;
  }

  if (type === "external-api") {
    return 680;
  }

  return 820;
}
