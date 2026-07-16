import {
  addEdge,
  Connection,
  Edge,
  EdgeChange,
  MarkerType,
  Node,
  NodeChange,
  OnNodesChange,
  ReactFlowInstance,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../auth/AuthContext";
import {
  isEditableHistoryTarget,
  useUndoRedo,
  useUndoRedoShortcuts,
} from "../hooks/useUndoRedo";
import {
  isGraphNodeChange,
  useNodeMeasurements,
} from "../hooks/useNodeMeasurements";
import { useBoardCollaboration } from "../hooks/useBoardCollaboration";
import { ArchitectureAssistPanel } from "../components/board/ArchitectureAssistPanel";
import { BoardCanvas } from "../components/board/BoardCanvas";
import { BoardToolbar } from "../components/board/BoardToolbar";
import { ContextPanel } from "../components/board/ContextPanel";
import { labelForType } from "../components/board/boardLabels";
import { analyzeHLDGraph } from "../services/aiAdvisorApi";
import { cleanupArchitectureLayout } from "../services/architectureEngine";
import {
  createHLDTransferFile,
  downloadTransferFile,
  exportDiagramAsPdf,
  exportDiagramAsPng,
  readTransferFile,
} from "../services/boardTransfer";
import {
  createBoard,
  getBoard,
  listRecentBoards,
  updateBoard,
} from "../services/boardApi";
import { createShareLink } from "../services/sharingApi";
import type {
  BoardEdge,
  BoardAccessRole,
  BoardElement,
  BoardElementMetadata,
  BoardElementType,
  BoardGraph,
  Position,
  RecentBoard,
} from "../types/board";
import type {
  AnalysisSource,
  HLDAnalysisSuggestion,
} from "../types/ai";

const addableElementTypes: BoardElementType[] = [
  "client",
  "api-gateway",
  "service",
  "database",
  "cache",
  "queue",
  "external-api",
];

const demoBoardName = "ArchFlow Demo: Order Platform";

const initialGraph: BoardGraph = createDemoGraph();

function createDemoGraph(): BoardGraph {
  return {
  elements: [
    createElement("client-1", "client", "Web Client", 80, 80, {
      links: "https://docs.archflow.local/web-client",
      notes: "Customer-facing checkout and account portal.",
      owner: "Frontend Team",
    }),
    createElement("gateway-1", "api-gateway", "Public API Gateway", 360, 120, {
      apiEndpoint: "https://api.archflow.local",
      notes: "Entry layer for auth, routing, rate limits, and request tracing.",
      owner: "Platform Team",
    }),
    createElement("service-1", "service", "Order Service", 620, 220, {
      apiEndpoint: "/api/orders",
      links: "https://docs.archflow.local/order-service",
      notes: "Owns order creation, status changes, and checkout orchestration.",
      owner: "Commerce Team",
    }),
    createElement("service-2", "service", "Notification Worker", 900, 220, {
      notes: "Consumes async events for email, SMS, and push notifications.",
      owner: "Messaging Team",
    }),
    createElement("queue-1", "queue", "Order Events", 760, 380, {
      notes: "Decouples checkout from notification delivery and fulfillment workflows.",
      owner: "Platform Team",
    }),
    createElement("cache-1", "cache", "Session Cache", 440, 420, {
      notes: "Stores short-lived sessions and request throttling counters.",
      owner: "Platform Team",
    }),
    createElement("database-1", "database", "Orders DB", 680, 520, {
      links: "https://docs.archflow.local/orders-schema",
      notes: "Primary order store. Needs backup and replication notes in a production design.",
      owner: "Data Team",
    }),
    createElement("external-api-1", "external-api", "Payment Provider", 960, 520, {
      apiEndpoint: "https://payments.example.com",
      notes: "External dependency. Add timeout, retry, and circuit breaker policies.",
      owner: "Vendor Integration Team",
    }),
  ],
  edges: [
    {
      id: "edge-client-service",
      sourceElementId: "client-1",
      targetElementId: "gateway-1",
    },
    {
      id: "edge-gateway-orders",
      sourceElementId: "gateway-1",
      targetElementId: "service-1",
    },
    {
      id: "edge-gateway-cache",
      sourceElementId: "gateway-1",
      targetElementId: "cache-1",
    },
    {
      id: "edge-orders-queue",
      sourceElementId: "service-1",
      targetElementId: "queue-1",
    },
    {
      id: "edge-queue-notifications",
      sourceElementId: "queue-1",
      targetElementId: "service-2",
    },
    {
      id: "edge-service-db",
      sourceElementId: "service-1",
      targetElementId: "database-1",
    },
    {
      id: "edge-orders-payments",
      sourceElementId: "service-1",
      targetElementId: "external-api-1",
    },
  ],
};
}

const lastBoardStorageKey = "archflow:last-board-id";

type BoardPageProps = {
  requestedBoardId?: string | null;
};

export function BoardPage({ requestedBoardId }: BoardPageProps) {
  const { requestAuth, status: authStatus, user } = useAuth();
  const canvasRef = useRef<HTMLElement>(null);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const loadedRequestedBoardRef = useRef<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardOwnerId, setBoardOwnerId] = useState<string | null>(null);
  const [boardAccessRole, setBoardAccessRole] = useState<BoardAccessRole | null>(null);
  const [boardName, setBoardName] = useState(demoBoardName);
  const {
    beginTransaction,
    canRedo,
    canUndo,
    commitTransaction,
    redo,
    resetState: resetGraph,
    setState: setGraph,
    state: graph,
    undo,
  } = useUndoRedo<BoardGraph>(initialGraph);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [recentBoards, setRecentBoards] = useState<RecentBoard[]>([]);
  const [suggestions, setSuggestions] = useState<HLDAnalysisSuggestion[]>([]);
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("Unsaved board");
  const [busyExport, setBusyExport] = useState<"pdf" | "png" | null>(null);
  const { captureMeasurements, measurementFor } = useNodeMeasurements();
  const collaboration = useBoardCollaboration<BoardGraph>({
    boardId,
    enabled: Boolean(user && boardId),
    graph,
    mode: "hld",
    onRemoteGraph: (remoteGraph) => {
      resetGraph(remoteGraph);
      setSelectedElementId(null);
      setSelectedEdgeId(null);
      setSaveStatus("idle");
      setStatusMessage("Live changes received");
    },
  });
  const readOnly = boardAccessRole === "viewer";

  const nodes = useMemo(
    () =>
      graph.elements.map((element) =>
        toFlowNode(
          element,
          element.id === selectedElementId,
          selectElement,
          measurementFor(element.id),
        ),
      ),
    [graph.elements, selectedElementId, measurementFor],
  );
  const edges = useMemo(
    () =>
      graph.edges.map((edge) =>
        toFlowEdge(
          edge,
          edge.id === selectedEdgeId,
          deleteEdge,
          selectEdge,
          readOnly,
        ),
      ),
    [graph.edges, selectedEdgeId, readOnly],
  );
  const selectedElement = graph.elements.find((element) => element.id === selectedElementId);
  const selectedEdge = graph.edges.find((edge) => edge.id === selectedEdgeId);
  const selectedEdgeDetails = selectedEdge
    ? edgeDetailsForGraphEdge(graph, selectedEdge)
    : undefined;

  useUndoRedoShortcuts(handleUndo, handleRedo);

  useEffect(() => {
    if (authStatus === "loading") {
      return;
    }

    if (!user) {
      setRecentBoards([]);
      setBoardId(null);
      setBoardOwnerId(null);
      setBoardAccessRole(null);
      setBoardAccessRole(null);
      setSaveStatus("idle");
      setStatusMessage("Unsaved board");
      return;
    }

    void refreshRecentBoards();
    const savedBoardId = localStorage.getItem(lastBoardKeyFor(user.id));

    if (!savedBoardId) {
      return;
    }

    void loadBoard(savedBoardId, "Loaded last saved board");
  }, [authStatus, user?.id]);

  useEffect(() => {
    if (
      !user ||
      !requestedBoardId ||
      loadedRequestedBoardRef.current === requestedBoardId
    ) {
      return;
    }

    loadedRequestedBoardRef.current = requestedBoardId;
    void loadBoard(requestedBoardId, "Joined shared board");
  }, [requestedBoardId, user?.id]);

  useEffect(() => {
    const handleSelectedItemDelete = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isEditingText =
        activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

      if (isEditingText || (event.key !== "Delete" && event.key !== "Backspace")) {
        return;
      }

      if (selectedElementId) {
        event.preventDefault();
        deleteSelectedElement();
        return;
      }

      if (selectedEdgeId) {
        event.preventDefault();
        deleteSelectedEdge();
      }
    };

    window.addEventListener("keydown", handleSelectedItemDelete);
    return () => window.removeEventListener("keydown", handleSelectedItemDelete);
  }, [selectedElementId, selectedEdgeId]);

  async function loadBoard(boardIdToLoad: string, successMessage = "Loaded board") {
    setSaveStatus("loading");
    setStatusMessage("Loading board...");

    try {
      const board = await getBoard(boardIdToLoad);

      setBoardId(board.id);
      setBoardOwnerId(board.ownerId);
      setBoardAccessRole(board.accessRole ?? (board.ownerId === user?.id ? "owner" : "editor"));
      setBoardName(board.name);
      resetGraph({
        elements: board.elements,
        edges: board.edges,
      });
      setSelectedElementId(null);
      setSelectedEdgeId(null);
      setSuggestions([]);
      setAnalysisSource(null);
      setAnalysisError("");
      if (user) {
        localStorage.setItem(lastBoardKeyFor(user.id), board.id);
      }
      await refreshRecentBoards();
      setSaveStatus("saved");
      setStatusMessage(successMessage);
    } catch (error) {
      if (user) {
        localStorage.removeItem(lastBoardKeyFor(user.id));
      }
      setSaveStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Could not load board");
    }
  }

  const handleNodesChange: OnNodesChange = (changes: NodeChange[]) => {
    if (readOnly) {
      return;
    }
    captureMeasurements(changes);
    const graphChanges = changes.filter(isGraphNodeChange);

    if (graphChanges.length === 0) {
      return;
    }

    const nextNodes = applyNodeChanges(graphChanges, nodes);
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

    if (selectedElementId && !nextNodeIds.has(selectedElementId)) {
      setSelectedElementId(null);
    }
    markUnsaved();
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    if (readOnly) {
      return;
    }
    if (!changes.some((change) => change.type === "remove")) {
      return;
    }

    const nextEdges = applyEdgeChanges(changes, edges);
    const nextEdgeIds = new Set(nextEdges.map((edge) => edge.id));

    setGraph((currentGraph) => ({
      ...currentGraph,
      edges: currentGraph.edges.filter((edge) => nextEdgeIds.has(edge.id)),
    }));

    if (selectedEdgeId && !nextEdgeIds.has(selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
    markUnsaved();
  };

  const handleConnect = (connection: Connection) => {
    if (readOnly) {
      return;
    }
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
    if (readOnly) {
      return;
    }
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
    if (!selectedElementId || readOnly) {
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

  const loadDemoBoard = () => {
    setBoardId(null);
    setBoardOwnerId(null);
    setBoardAccessRole(null);
    setBoardName(demoBoardName);
    resetGraph(createDemoGraph());
    setSelectedElementId(null);
    setSelectedEdgeId(null);
    setSuggestions([]);
    setAnalysisSource(null);
    setAnalysisError("");
    if (user) {
      localStorage.removeItem(lastBoardKeyFor(user.id));
    }
    setSaveStatus("idle");
    setStatusMessage("Unsaved demo board");
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) {
      return;
    }

    deleteEdge(selectedEdgeId);
  };

  function selectEdge(edgeId: string) {
    setSelectedEdgeId(edgeId);
    setSelectedElementId(null);
  }

  function selectElement(nodeId: string) {
    setSelectedElementId(nodeId);
    setSelectedEdgeId(null);
  }

  function deleteEdge(edgeId: string) {
    if (readOnly) {
      return;
    }
    setGraph((currentGraph) => ({
      ...currentGraph,
      edges: currentGraph.edges.filter((edge) => edge.id !== edgeId),
    }));
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
    }
    markUnsaved();
  }

  const handleCleanUp = () => {
    if (readOnly) {
      return;
    }
    setGraph(cleanupArchitectureLayout(graph));
    markUnsaved();
  };

  const handleSaveBoard = async () => {
    if (!user) {
      requestAuth("Sign in to save this board to your account.");
      return;
    }

    try {
      await saveBoardToCloud(user.id);
    } catch {
      // saveBoardToCloud reports the error in the board status.
    }
  };

  async function saveBoardToCloud(userId: string) {
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
      setBoardOwnerId(savedBoard.ownerId);
      setBoardAccessRole(savedBoard.accessRole ?? "owner");
      setBoardName(savedBoard.name);
      localStorage.setItem(lastBoardKeyFor(userId), savedBoard.id);
      await refreshRecentBoards();
      setSaveStatus("saved");
      setStatusMessage("Saved");
      return savedBoard;
    } catch (error) {
      setSaveStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Save failed");
      throw error;
    }
  }

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

  const updateSelectedElementMetadata = (metadata: BoardElementMetadata) => {
    if (!selectedElementId) {
      return;
    }

    setGraph((currentGraph) => ({
      ...currentGraph,
      elements: currentGraph.elements.map((element) =>
        element.id === selectedElementId
          ? {
              ...element,
              metadata,
            }
          : element,
      ),
    }));
    markUnsaved();
  };

  const applySuggestion = (suggestion: HLDAnalysisSuggestion) => {
    if (!suggestion.action || readOnly) {
      return;
    }

    const nextGraph = applyArchitectureSuggestion(graph, suggestion);
    setGraph(nextGraph);
    setSuggestions((currentSuggestions) =>
      currentSuggestions.filter((currentSuggestion) => currentSuggestion.id !== suggestion.id),
    );
    markUnsaved();
  };

  const handleAnalyze = async () => {
    setAnalysisLoading(true);
    setAnalysisError("");

    try {
      const result = await analyzeHLDGraph(graph);
      setSuggestions(result.suggestions);
      setAnalysisSource(result.source);
    } catch (error) {
      setSuggestions([]);
      setAnalysisSource(null);
      setAnalysisError(error instanceof Error ? error.message : "AI analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleExportJson = () => {
    downloadTransferFile(createHLDTransferFile(boardName, graph));
  };

  const handleImportJson = async (file: File) => {
    try {
      const transferFile = await readTransferFile(file);

      if (transferFile.mode !== "hld") {
        throw new Error("This file contains an LLD board. Import it from the LLD tab.");
      }

      setBoardId(null);
      setBoardOwnerId(null);
      setBoardName(transferFile.name);
      resetGraph(transferFile.graph);
      setSelectedElementId(null);
      setSelectedEdgeId(null);
      setSuggestions([]);
      setAnalysisSource(null);
      setAnalysisError("");
      if (user) {
        localStorage.removeItem(lastBoardKeyFor(user.id));
      }
      setSaveStatus("idle");
      setStatusMessage("Imported board - save to store it");
    } catch (error) {
      setSaveStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Import failed");
    }
  };

  const handleVisualExport = async (format: "pdf" | "png") => {
    if (!canvasRef.current || !flowRef.current) {
      setSaveStatus("error");
      setStatusMessage("The diagram canvas is not ready to export.");
      return;
    }

    setBusyExport(format);

    try {
      const bounds = flowRef.current.getNodesBounds(flowRef.current.getNodes());

      if (format === "png") {
        await exportDiagramAsPng(canvasRef.current, boardName, bounds);
      } else {
        await exportDiagramAsPdf(canvasRef.current, boardName, bounds);
      }
    } catch (error) {
      setSaveStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusyExport(null);
    }
  };

  return (
    <main className="app-shell">
      <BoardToolbar
        boardId={boardId}
        boardName={boardName}
        analyzing={analysisLoading}
        busyExport={busyExport}
        canRedo={!readOnly && canRedo}
        canShare={Boolean(!boardId || (user && boardOwnerId === user.id))}
        canUndo={!readOnly && canUndo}
        collaborationError={collaboration.error}
        collaborationParticipants={collaboration.participants}
        collaborationStatus={collaboration.status}
        currentUserId={user?.id ?? null}
        nodeTypes={addableElementTypes}
        recentBoards={recentBoards}
        readOnly={readOnly}
        saveStatus={saveStatus}
        statusMessage={statusMessage}
        onAddNode={addNode}
        onAnalyze={() => void handleAnalyze()}
        onBoardNameChange={(name) => {
          setBoardName(name);
          markUnsaved();
        }}
        onCleanUp={handleCleanUp}
        onExportJson={handleExportJson}
        onExportPdf={() => void handleVisualExport("pdf")}
        onExportPng={() => void handleVisualExport("png")}
        onImportJson={(file) => void handleImportJson(file)}
        onLoadDemoBoard={loadDemoBoard}
        onLoadBoard={(boardIdToLoad) => {
          void loadBoard(boardIdToLoad);
        }}
        onRedo={handleRedo}
        onSaveBoard={handleSaveBoard}
        onCreateShareLink={async (role) => {
          if (!user) {
            requestAuth("Sign in to save and share this board.");
            throw new Error("Sign in to continue sharing.");
          }

          if (boardId && boardOwnerId !== user.id) {
            throw new Error("Only the board owner can create a share link.");
          }

          const savedBoard = await saveBoardToCloud(user.id);
          return {
            boardId: savedBoard.id,
            shareUrl: await createShareLink("hld", savedBoard.id, role),
          };
        }}
        onRestoreVersion={(restoredGraph) => {
          resetGraph(restoredGraph);
          setSelectedElementId(null);
          setSelectedEdgeId(null);
          setSaveStatus("saved");
          setStatusMessage("Version restored");
        }}
        onUndo={handleUndo}
      />

      <BoardCanvas
        canvasRef={canvasRef}
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeDragStart={beginTransaction}
        onNodeDragStop={commitTransaction}
        onReady={(instance) => {
          flowRef.current = instance;
        }}
        onEdgeSelect={selectEdge}
        onNodeSelect={selectElement}
        onSelectionClear={() => {
          setSelectedElementId(null);
          setSelectedEdgeId(null);
        }}
        onCursorMove={collaboration.sendCursor}
        readOnly={readOnly}
        remoteCursors={collaboration.remoteCursors}
      />

      <aside
        className="context-panel"
        onFocusCapture={(event) => {
          if (isEditableHistoryTarget(event.target)) {
            beginTransaction();
          }
        }}
        onBlurCapture={(event) => {
          if (isEditableHistoryTarget(event.target)) {
            commitTransaction();
          }
        }}
      >
        <ContextPanel
          selectedEdge={selectedEdgeDetails}
          selectedElement={selectedElement}
          onDeleteElement={deleteSelectedElement}
          onLabelChange={updateSelectedElementLabel}
          onMetadataChange={updateSelectedElementMetadata}
          readOnly={readOnly}
        />
        <ArchitectureAssistPanel
          error={analysisError}
          loading={analysisLoading}
          source={analysisSource}
          suggestions={suggestions}
          onApplySuggestion={applySuggestion}
          readOnly={readOnly}
        />
      </aside>
    </main>
  );

  function markUnsaved() {
    if (saveStatus !== "loading" && saveStatus !== "saving") {
      setSaveStatus("idle");
      setStatusMessage(boardId ? "Unsaved changes" : "Unsaved board");
    }
  }

  async function refreshRecentBoards() {
    if (!user) {
      setRecentBoards([]);
      return;
    }

    try {
      setRecentBoards(await listRecentBoards());
    } catch {
      setRecentBoards([]);
    }
  }

  function handleUndo() {
    if (!canUndo) {
      return;
    }

    undo();
    setSelectedElementId(null);
    setSelectedEdgeId(null);
    markUnsaved();
  }

  function handleRedo() {
    if (!canRedo) {
      return;
    }

    redo();
    setSelectedElementId(null);
    setSelectedEdgeId(null);
    markUnsaved();
  }
}

function createElement(
  id: string,
  type: BoardElementType,
  label: string,
  x: number,
  y: number,
  metadata?: BoardElementMetadata,
): BoardElement {
  return {
    id,
    type,
    label,
    position: { x, y },
    size: { width: 180, height: 64 },
    metadata,
  };
}

function toFlowNode(
  element: BoardElement,
  selected: boolean,
  onSelect: (nodeId: string) => void,
  measured: Node["measured"],
): Node {
  return {
    id: element.id,
    type: "architecture",
    position: element.position,
    data: {
      contextBadges: contextBadgesForElement(element),
      elementType: labelForType(element.type),
      label: element.label,
      onSelect,
    },
    selected,
    measured,
    style: {
      width: element.size.width,
    },
  };
}

function toFlowEdge(
  edge: { id: string; sourceElementId: string; targetElementId: string },
  selected: boolean,
  onDelete: (edgeId: string) => void,
  onSelect: (edgeId: string) => void,
  readOnly: boolean,
): Edge {
  return {
    id: edge.id,
    type: "architecture",
    source: edge.sourceElementId,
    target: edge.targetElementId,
    animated: true,
    data: {
      onDelete: readOnly ? undefined : onDelete,
      onSelect,
    },
    interactionWidth: 28,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: selected ? "#315ddc" : "#94a3b8",
    },
    selected,
    style: {
      stroke: selected ? "#315ddc" : "#94a3b8",
      strokeDasharray: selected ? undefined : "6 6",
      strokeWidth: selected ? 3 : 2,
    },
  };
}

function applyArchitectureSuggestion(
  graph: BoardGraph,
  suggestion: HLDAnalysisSuggestion,
): BoardGraph {
  const action = suggestion.action;

  if (!action) {
    return graph;
  }

  const suggestedElement = createElement(
    `${action.elementType}-${crypto.randomUUID()}`,
    action.elementType,
    action.label,
    suggestedPositionForType(graph, action.elementType).x,
    suggestedPositionForType(graph, action.elementType).y,
  );

  return {
    elements: [...graph.elements, suggestedElement],
    edges: [...graph.edges, ...suggestedEdgesForElement(graph, suggestedElement, action)],
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
  action: NonNullable<HLDAnalysisSuggestion["action"]>,
): BoardEdge[] {
  const validElementIds = new Set(graph.elements.map((element) => element.id));
  const newEdges: BoardEdge[] = [];

  const addSuggestedEdge = (sourceElementId: string, targetElementId: string) => {
    if (!validElementIds.has(sourceElementId) && sourceElementId !== suggestedElement.id) {
      return;
    }

    if (!validElementIds.has(targetElementId) && targetElementId !== suggestedElement.id) {
      return;
    }

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

  for (const sourceElementId of action.connectFromElementIds) {
    addSuggestedEdge(sourceElementId, suggestedElement.id);
  }

  for (const targetElementId of action.connectToElementIds) {
    addSuggestedEdge(suggestedElement.id, targetElementId);
  }

  return newEdges;
}

function elementLabelForId(graph: BoardGraph, elementId: string): string {
  const element = graph.elements.find((currentElement) => currentElement.id === elementId);
  return element ? element.label : elementId;
}

function edgeDetailsForGraphEdge(
  graph: BoardGraph,
  edge: { id: string; sourceElementId: string; targetElementId: string },
) {
  return {
    id: edge.id,
    sourceLabel: elementLabelForId(graph, edge.sourceElementId),
    targetLabel: elementLabelForId(graph, edge.targetElementId),
  };
}

function contextBadgesForElement(element: BoardElement): string[] {
  const metadata = element.metadata;

  if (!metadata) {
    return [];
  }

  const badges: string[] = [];

  if (metadata.owner) {
    badges.push("Owner");
  }

  if (metadata.apiEndpoint) {
    badges.push("API");
  }

  if (metadata.links) {
    badges.push("Links");
  }

  if (metadata.notes) {
    badges.push("Notes");
  }

  if (metadata.contextItems?.length) {
    badges.push(`${metadata.contextItems.length} Attachments`);
  }

  return badges;
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

function lastBoardKeyFor(userId: string): string {
  return `${lastBoardStorageKey}:${userId}`;
}
