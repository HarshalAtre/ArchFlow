import {
  Background,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
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
  ReactFlowProvider,
  applyNodeChanges,
  getBezierPath,
} from "@xyflow/react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import { HistoryControls } from "../components/HistoryControls";
import {
  isEditableHistoryTarget,
  useUndoRedo,
  useUndoRedoShortcuts,
} from "../hooks/useUndoRedo";
import { analyzeLLDDesign, type LLDSuggestion } from "../services/lldDesignAdvisor";
import {
  createLLDBoard,
  getLLDBoard,
  listRecentLLDBoards,
  updateLLDBoard,
} from "../services/lldBoardApi";
import {
  cloneLLDDraft,
  getDefaultLLDDraft,
  lldTemplates,
} from "../services/lldTemplates";
import type {
  LLDBoard,
  LLDDraft,
  RecentLLDBoard,
  UmlClass,
  UmlClassKind,
  UmlHandleId,
  UmlMember,
  UmlRelationship,
  UmlRelationshipKind,
  UmlVisibility,
} from "../types/lld";

type UmlNodeData = {
  attributes: UmlMember[];
  kind: UmlClassKind;
  methods: UmlMember[];
  name: string;
};

type UmlRelationshipEdgeData = {
  kind: UmlRelationshipKind;
  label: string;
  onSelect?: (relationshipId: string) => void;
  sourceMultiplicity: string;
  targetMultiplicity: string;
};

type UmlNode = Node<UmlNodeData, "uml-class">;
type UmlRelationshipEdge = Edge<UmlRelationshipEdgeData, "uml-relationship">;

const umlNodeTypes: NodeTypes = {
  "uml-class": UmlClassNode,
};

const umlEdgeTypes: EdgeTypes = {
  "uml-relationship": UmlRelationshipEdge,
};

const classKinds: UmlClassKind[] = ["class", "abstract", "interface", "enum"];
const lldDraftStorageKey = "archflow:lld-draft";
const lastLLDBoardStorageKey = "archflow:last-lld-board-id";
const lldSelectedClassStorageKey = "archflow:lld-selected-class";
const relationshipKinds: UmlRelationshipKind[] = [
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition",
];
const umlHandleIds: UmlHandleId[] = ["top", "right", "bottom", "left"];
const visibilities: UmlVisibility[] = ["+", "-", "#", "~"];

export function LLDPage() {
  const initialDraft = useMemo(() => readLLDDraft(), []);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState("Order Platform LLD");
  const {
    beginTransaction,
    canRedo,
    canUndo,
    commitTransaction,
    redo,
    resetState: resetLLDGraph,
    setState: setLLDGraph,
    state: lldGraph,
    undo,
  } = useUndoRedo<LLDDraft>(initialDraft);
  const { classes, relationships } = lldGraph;
  const [selectedClassId, setSelectedClassId] = useState<string | null>(() => readSelectedClassId());
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(lldTemplates[0].id);
  const [suggestions, setSuggestions] = useState<LLDSuggestion[]>([]);
  const [recentBoards, setRecentBoards] = useState<RecentLLDBoard[]>([]);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "loading" | "saving" | "saved" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("Unsaved LLD board");

  const nodes = useMemo(
    () =>
      classes.map((umlClass): UmlNode => ({
        id: umlClass.id,
        type: "uml-class",
        position: umlClass.position,
        selected: umlClass.id === selectedClassId,
        data: {
          attributes: umlClass.attributes,
          kind: umlClass.kind,
          methods: umlClass.methods,
          name: umlClass.name,
        },
      })),
    [classes, selectedClassId],
  );

  const edges = useMemo(
    () =>
      relationships.map((relationship): UmlRelationshipEdge => {
        const handles = handlesForRelationship(relationship, classes);

        return {
          id: relationship.id,
          type: "uml-relationship",
          source: relationship.sourceClassId,
          sourceHandle: handles.source,
          target: relationship.targetClassId,
          targetHandle: handles.target,
          data: {
            kind: relationship.kind,
            label: relationship.label,
            onSelect: selectRelationship,
            sourceMultiplicity: relationship.sourceMultiplicity,
            targetMultiplicity: relationship.targetMultiplicity,
          },
          selected: relationship.id === selectedRelationshipId,
        };
      }),
    [classes, relationships, selectedRelationshipId],
  );

  const selectedClass = classes.find((umlClass) => umlClass.id === selectedClassId);
  const selectedRelationship = relationships.find(
    (relationship) => relationship.id === selectedRelationshipId,
  );
  const selectedTemplate =
    lldTemplates.find((template) => template.id === selectedTemplateId) ?? lldTemplates[0];

  useUndoRedoShortcuts(handleUndo, handleRedo);

  useEffect(() => {
    void refreshRecentBoards();

    const lastBoardId = localStorage.getItem(lastLLDBoardStorageKey);

    if (lastBoardId) {
      void loadBoard(lastBoardId, "Loaded last saved LLD board");
    }
  }, []);

  useLayoutEffect(() => {
    localStorage.setItem(
      lldDraftStorageKey,
      JSON.stringify({
        classes,
        relationships,
        version: 1,
      }),
    );
  }, [classes, relationships]);

  useEffect(() => {
    if (selectedClassId) {
      localStorage.setItem(lldSelectedClassStorageKey, selectedClassId);
    } else {
      localStorage.removeItem(lldSelectedClassStorageKey);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId && !classes.some((umlClass) => umlClass.id === selectedClassId)) {
      setSelectedClassId(classes.at(0)?.id ?? null);
    }
  }, [classes, selectedClassId]);

  const handleNodesChange = (changes: NodeChange[]) => {
    if (!changes.some((change) => change.type === "position" || change.type === "remove")) {
      return;
    }

    const nextNodes = applyNodeChanges(changes, nodes);
    const nextNodeIds = new Set(nextNodes.map((node) => node.id));

    setLLDGraph((currentGraph) => ({
      classes: currentGraph.classes
        .filter((umlClass) => nextNodeIds.has(umlClass.id))
        .map((umlClass) => {
          const matchingNode = nextNodes.find((node) => node.id === umlClass.id);
          return matchingNode
            ? {
                ...umlClass,
                position: matchingNode.position,
              }
            : umlClass;
        }),
      relationships: currentGraph.relationships.filter(
        (relationship) =>
          nextNodeIds.has(relationship.sourceClassId) && nextNodeIds.has(relationship.targetClassId),
      ),
    }));

    if (changes.some((change) => change.type === "position" || change.type === "remove")) {
      markUnsaved();
    }
  };

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) {
      return;
    }

    const nextRelationship: UmlRelationship = {
      id: `relationship-${crypto.randomUUID()}`,
      sourceClassId: connection.source,
      targetClassId: connection.target,
      sourceHandleId: isUmlHandleId(connection.sourceHandle) ? connection.sourceHandle : undefined,
      targetHandleId: isUmlHandleId(connection.targetHandle) ? connection.targetHandle : undefined,
      kind: "association",
      label: "",
      sourceMultiplicity: "",
      targetMultiplicity: "",
    };

    setLLDGraph((currentGraph) => ({
      ...currentGraph,
      relationships: [...currentGraph.relationships, nextRelationship],
    }));
    setSelectedClassId(null);
    setSelectedRelationshipId(nextRelationship.id);
    markUnsaved();
  };

  const addClass = (kind: UmlClassKind = "class") => {
    const nextClass: UmlClass = {
      id: `uml-${crypto.randomUUID()}`,
      kind,
      name: kind === "interface" ? "NewInterface" : "NewClass",
      position: { x: 160 + classes.length * 40, y: 160 + classes.length * 24 },
      attributes: kind === "interface" ? [] : [createMember("-", "dependency: Type")],
      methods: [createMember("+", "operation(): void")],
      responsibility: "",
    };

    setLLDGraph((currentGraph) => ({
      ...currentGraph,
      classes: [...currentGraph.classes, nextClass],
    }));
    setSelectedClassId(nextClass.id);
    setSelectedRelationshipId(null);
    markUnsaved();
  };

  const updateSelectedClass = (updates: Partial<UmlClass>) => {
    if (!selectedClassId) {
      return;
    }

    setLLDGraph((currentGraph) => ({
      ...currentGraph,
      classes: currentGraph.classes.map((umlClass) =>
        umlClass.id === selectedClassId ? { ...umlClass, ...updates } : umlClass,
      ),
    }));
    markUnsaved();
  };

  const deleteSelectedClass = () => {
    if (!selectedClassId) {
      return;
    }

    setLLDGraph((currentGraph) => ({
      classes: currentGraph.classes.filter((umlClass) => umlClass.id !== selectedClassId),
      relationships: currentGraph.relationships.filter(
        (relationship) =>
          relationship.sourceClassId !== selectedClassId && relationship.targetClassId !== selectedClassId,
      ),
    }));
    setSelectedClassId(null);
    markUnsaved();
  };

  const updateSelectedRelationship = (updates: Partial<UmlRelationship>) => {
    if (!selectedRelationshipId) {
      return;
    }

    setLLDGraph((currentGraph) => ({
      ...currentGraph,
      relationships: currentGraph.relationships.map((relationship) =>
        relationship.id === selectedRelationshipId ? { ...relationship, ...updates } : relationship,
      ),
    }));
    markUnsaved();
  };

  const deleteSelectedRelationship = () => {
    if (!selectedRelationshipId) {
      return;
    }

    setLLDGraph((currentGraph) => ({
      ...currentGraph,
      relationships: currentGraph.relationships.filter(
        (relationship) => relationship.id !== selectedRelationshipId,
      ),
    }));
    setSelectedRelationshipId(null);
    markUnsaved();
  };

  const loadSelectedTemplate = () => {
    const nextDraft = cloneLLDDraft(selectedTemplate.draft);

    resetLLDGraph(nextDraft);
    setSelectedClassId(nextDraft.classes.at(0)?.id ?? null);
    setSelectedRelationshipId(null);
    setSuggestions([]);
    setBoardId(null);
    setBoardName(`${selectedTemplate.name} LLD`);
    localStorage.removeItem(lastLLDBoardStorageKey);
    setSaveStatus("idle");
    setStatusMessage("Unsaved template");
  };

  const handleSaveBoard = async () => {
    setSaveStatus("saving");
    setStatusMessage("Saving...");

    try {
      const payload = {
        name: boardName.trim() || "Untitled LLD",
        classes,
        relationships,
      };
      const savedBoard = boardId
        ? await updateLLDBoard(boardId, payload)
        : await createLLDBoard(payload);

      applySavedBoard(savedBoard);
      await refreshRecentBoards();
      setSaveStatus("saved");
      setStatusMessage("Saved to MongoDB");
    } catch (error) {
      setSaveStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Save failed");
    }
  };

  async function loadBoard(boardIdToLoad: string, successMessage = "Loaded saved LLD board") {
    setSaveStatus("loading");
    setStatusMessage("Loading...");

    try {
      const board = await getLLDBoard(boardIdToLoad);
      applySavedBoard(board);
      setSaveStatus("saved");
      setStatusMessage(successMessage);
    } catch (error) {
      localStorage.removeItem(lastLLDBoardStorageKey);
      setSaveStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Could not load LLD board");
    }
  }

  function applySavedBoard(board: LLDBoard) {
    setBoardId(board.id);
    setBoardName(board.name);
    resetLLDGraph({
      classes: board.classes,
      relationships: board.relationships,
    });
    setSelectedClassId(board.classes.at(0)?.id ?? null);
    setSelectedRelationshipId(null);
    setSuggestions([]);
    localStorage.setItem(lastLLDBoardStorageKey, board.id);
  }

  async function refreshRecentBoards() {
    try {
      setRecentBoards(await listRecentLLDBoards());
    } catch {
      setRecentBoards([]);
    }
  }

  function selectRelationship(relationshipId: string) {
    setSelectedRelationshipId(relationshipId);
    setSelectedClassId(null);
  }

  function markUnsaved() {
    if (saveStatus !== "loading" && saveStatus !== "saving") {
      setSaveStatus("idle");
      setStatusMessage(boardId ? "Unsaved changes" : "Unsaved LLD board");
    }
  }

  function handleUndo() {
    if (!canUndo) {
      return;
    }

    undo();
    setSelectedClassId(null);
    setSelectedRelationshipId(null);
    markUnsaved();
  }

  function handleRedo() {
    if (!canRedo) {
      return;
    }

    redo();
    setSelectedClassId(null);
    setSelectedRelationshipId(null);
    markUnsaved();
  }

  return (
    <main className="app-shell lld-shell">
      <aside className="toolbar">
        <div>
          <p className="eyebrow">LLD Practice</p>
          <h1>UML Class Designer</h1>
        </div>

        <div className="tool-section">
          <span className="section-label">Saved Board</span>
          <label className="field-group">
            <span>Name</span>
            <input
              aria-label="LLD board name"
              className="text-input"
              value={boardName}
              onChange={(event) => {
                setBoardName(event.target.value);
                markUnsaved();
              }}
            />
          </label>
          <button
            type="button"
            className="primary-button"
            disabled={saveStatus === "loading" || saveStatus === "saving"}
            onClick={() => void handleSaveBoard()}
          >
            {boardId ? "Update LLD Board" : "Save LLD Board"}
          </button>
          <p
            className={`status-text ${
              saveStatus === "saved"
                ? "status-saved"
                : saveStatus === "error"
                  ? "status-error"
                  : ""
            }`}
          >
            {statusMessage}
          </p>
          {recentBoards.length > 0 ? (
            <div className="recent-board-list">
              {recentBoards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  className="recent-board-button"
                  onClick={() => void loadBoard(board.id)}
                >
                  <span>{board.name}</span>
                  <small>{formatUpdatedAt(board.updatedAt)}</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="tool-section">
          <span className="section-label">Practice Template</span>
          <select
            aria-label="LLD practice template"
            className="text-input"
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
          >
            {lldTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <p className="status-text">{selectedTemplate.description}</p>
          <button type="button" onClick={loadSelectedTemplate}>
            Load Template
          </button>
        </div>

        <div className="tool-section">
          <span className="section-label">Add UML Type</span>
          <div className="button-grid">
            <button type="button" onClick={() => addClass("class")}>
              Class
            </button>
            <button type="button" onClick={() => addClass("interface")}>
              Interface
            </button>
            <button type="button" onClick={() => addClass("abstract")}>
              Abstract Class
            </button>
            <button type="button" onClick={() => addClass("enum")}>
              Enum
            </button>
          </div>
        </div>

        <div className="tool-section">
          <span className="section-label">Review</span>
          <HistoryControls
            canRedo={canRedo}
            canUndo={canUndo}
            onRedo={handleRedo}
            onUndo={handleUndo}
          />
          <button
            type="button"
            className="primary-button"
            onClick={() => setSuggestions(analyzeLLDDesign(classes, relationships))}
          >
            Analyze LLD
          </button>
          <p className="status-text">Checks responsibilities, contracts, coupling, and UML relation usage.</p>
        </div>

        <div className="tool-section">
          <span className="section-label">Notation</span>
          <p className="status-text">+ public, - private, # protected, ~ package/internal.</p>
          <p className="status-text">Drag from one class handle to another to create a relationship.</p>
          <p className="status-text">Use inheritance/implementation for is-a, aggregation/composition for has-a.</p>
        </div>
      </aside>

      <section className="board-canvas">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            edgeTypes={umlEdgeTypes}
            nodeTypes={umlNodeTypes}
            connectionMode={ConnectionMode.Loose}
            onConnect={handleConnect}
            onNodeDragStart={beginTransaction}
            onNodeDragStop={commitTransaction}
            onNodesChange={handleNodesChange}
            onEdgeClick={(_, edge) => selectRelationship(edge.id)}
            onNodeClick={(_, node) => {
              setSelectedClassId(node.id);
              setSelectedRelationshipId(null);
            }}
            onPaneClick={() => {
              setSelectedClassId(null);
              setSelectedRelationshipId(null);
            }}
            fitView
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </ReactFlowProvider>
      </section>

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
        <LLDContextPanel
          selectedClass={selectedClass}
          selectedRelationship={selectedRelationship}
          onClassChange={updateSelectedClass}
          onDeleteClass={deleteSelectedClass}
          onDeleteRelationship={deleteSelectedRelationship}
          onRelationshipChange={updateSelectedRelationship}
        />
        <LLDAnalysisPanel suggestions={suggestions} />
      </aside>
    </main>
  );
}

type LLDContextPanelProps = {
  selectedClass: UmlClass | undefined;
  selectedRelationship: UmlRelationship | undefined;
  onClassChange: (updates: Partial<UmlClass>) => void;
  onDeleteClass: () => void;
  onDeleteRelationship: () => void;
  onRelationshipChange: (updates: Partial<UmlRelationship>) => void;
};

function LLDContextPanel({
  selectedClass,
  selectedRelationship,
  onClassChange,
  onDeleteClass,
  onDeleteRelationship,
  onRelationshipChange,
}: LLDContextPanelProps) {
  if (selectedRelationship) {
    return (
      <section>
        <span className="section-label">LLD Relationship</span>
        <div className="selected-card">
          <label className="field-group">
            <span>Relation Type</span>
            <select
              className="text-input"
              value={selectedRelationship.kind}
              onChange={(event) =>
                onRelationshipChange({ kind: event.target.value as UmlRelationshipKind })
              }
            >
              {relationshipKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {labelForRelationshipKind(kind)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Label</span>
            <input
              className="text-input"
              value={selectedRelationship.label}
              onChange={(event) => onRelationshipChange({ label: event.target.value })}
              placeholder="uses, owns, creates..."
            />
          </label>

          <div className="split-fields">
            <label className="field-group">
              <span>Source</span>
              <input
                className="text-input"
                value={selectedRelationship.sourceMultiplicity}
                onChange={(event) =>
                  onRelationshipChange({ sourceMultiplicity: event.target.value })
                }
                placeholder="1"
              />
            </label>
            <label className="field-group">
              <span>Target</span>
              <input
                className="text-input"
                value={selectedRelationship.targetMultiplicity}
                onChange={(event) =>
                  onRelationshipChange({ targetMultiplicity: event.target.value })
                }
                placeholder="0..*"
              />
            </label>
          </div>

          <p className="status-text">{descriptionForRelationshipKind(selectedRelationship.kind)}</p>

          <button type="button" className="danger-button" onClick={onDeleteRelationship}>
            Delete relationship
          </button>
        </div>
      </section>
    );
  }

  if (!selectedClass) {
    return (
      <section>
        <span className="section-label">LLD Context</span>
        <p className="muted">Select a UML class to edit its name, fields, methods, and responsibility.</p>
      </section>
    );
  }

  return (
    <section>
      <span className="section-label">LLD Context</span>
      <div className="selected-card">
        <label className="field-group">
          <span>Type</span>
          <select
            className="text-input"
            value={selectedClass.kind}
            onChange={(event) => onClassChange({ kind: event.target.value as UmlClassKind })}
          >
            {classKinds.map((kind) => (
              <option key={kind} value={kind}>
                {labelForClassKind(kind)}
              </option>
            ))}
          </select>
        </label>

        <label className="field-group">
          <span>Name</span>
          <input
            aria-label="Selected UML class name"
            className="text-input"
            value={selectedClass.name}
            onChange={(event) => onClassChange({ name: event.target.value })}
          />
        </label>

        <MemberEditor
          label="Attributes"
          members={selectedClass.attributes}
          emptyText="Interfaces and enums can skip attributes."
          onMembersChange={(attributes) => onClassChange({ attributes })}
        />

        <MemberEditor
          label="Methods"
          members={selectedClass.methods}
          emptyText="Add operations that express behavior."
          onMembersChange={(methods) => onClassChange({ methods })}
        />

        <label className="field-group">
          <span>Responsibility</span>
          <textarea
            className="compact-textarea"
            value={selectedClass.responsibility}
            onChange={(event) => onClassChange({ responsibility: event.target.value })}
            placeholder="What does this class own? Which reason should make it change?"
          />
        </label>

        <button type="button" className="danger-button" onClick={onDeleteClass}>
          Delete UML type
        </button>
      </div>
    </section>
  );
}

function LLDAnalysisPanel({ suggestions }: { suggestions: LLDSuggestion[] }) {
  return (
    <section>
      <span className="section-label">LLD Analysis</span>
      {suggestions.length > 0 ? (
        <div className="suggestions">
          {suggestions.map((suggestion) => (
            <article key={suggestion.id} className={`suggestion-card severity-${suggestion.severity}`}>
              <span>{labelForSeverity(suggestion.severity)}</span>
              <strong>{suggestion.title}</strong>
              <p>{suggestion.description}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Run Analyze LLD to get design feedback for interview practice.</p>
      )}
    </section>
  );
}

type MemberEditorProps = {
  emptyText: string;
  label: string;
  members: UmlMember[];
  onMembersChange: (members: UmlMember[]) => void;
};

function MemberEditor({ emptyText, label, members, onMembersChange }: MemberEditorProps) {
  const updateMember = (memberId: string, updates: Partial<UmlMember>) => {
    onMembersChange(
      members.map((member) => (member.id === memberId ? { ...member, ...updates } : member)),
    );
  };

  return (
    <div className="field-group">
      <span>{label}</span>
      {members.length > 0 ? (
        <div className="uml-member-editor">
          {members.map((member) => (
            <div key={member.id} className="uml-member-row">
              <select
                aria-label={`${label} visibility`}
                className="text-input uml-visibility-select"
                value={member.visibility}
                onChange={(event) =>
                  updateMember(member.id, { visibility: event.target.value as UmlVisibility })
                }
              >
                {visibilities.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility}
                  </option>
                ))}
              </select>
              <input
                aria-label={`${label} signature`}
                className="text-input"
                value={member.signature}
                onChange={(event) => updateMember(member.id, { signature: event.target.value })}
              />
              <button
                type="button"
                className="danger-button uml-member-remove"
                onClick={() => onMembersChange(members.filter((currentMember) => currentMember.id !== member.id))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="status-text">{emptyText}</p>
      )}
      <button type="button" onClick={() => onMembersChange([...members, createMember("+", "")])}>
        Add {label.slice(0, -1)}
      </button>
    </div>
  );
}

function UmlClassNode({ data, selected }: NodeProps<UmlNode>) {
  return (
    <div className={`uml-class-node ${selected ? "uml-class-node-selected" : ""}`}>
      <UmlConnectionHandle id="top" position={Position.Top} />
      <UmlConnectionHandle id="right" position={Position.Right} />
      <UmlConnectionHandle id="bottom" position={Position.Bottom} />
      <UmlConnectionHandle id="left" position={Position.Left} />
      <div className="uml-class-header">
        {data.kind === "interface" ? <span>&lt;&lt;interface&gt;&gt;</span> : null}
        {data.kind === "abstract" ? <span>&lt;&lt;abstract&gt;&gt;</span> : null}
        {data.kind === "enum" ? <span>&lt;&lt;enum&gt;&gt;</span> : null}
        <strong>{data.name || "UnnamedType"}</strong>
      </div>
      <UmlMemberSection members={data.attributes} fallback="- attributes" />
      <UmlMemberSection members={data.methods} fallback="+ methods()" />
    </div>
  );
}

function UmlConnectionHandle({ id, position }: { id: UmlHandleId; position: Position }) {
  return (
    <Handle
      id={id}
      className={`uml-class-handle uml-class-handle-${id}`}
      type="source"
      position={position}
    />
  );
}

function UmlRelationshipEdge({
  id,
  data,
  selected,
  ...edgeProps
}: EdgeProps<UmlRelationshipEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath(edgeProps);
  const relationship = data ?? {
    kind: "association" as UmlRelationshipKind,
    label: "",
    onSelect: undefined,
    sourceMultiplicity: "",
    targetMultiplicity: "",
  };
  const markerEndId = `${id}-end-marker`;
  const markerStartId = `${id}-start-marker`;
  const isDashed = relationship.kind === "dependency" || relationship.kind === "implementation";
  const isComposition = relationship.kind === "composition";
  const isAggregation = relationship.kind === "aggregation";
  const hasStartMarker = isComposition || isAggregation;
  const hasEndTriangle =
    relationship.kind === "inheritance" || relationship.kind === "implementation";
  const hasEndArrow = relationship.kind === "association" || relationship.kind === "dependency";
  const strokeColor = selected ? "#1d4ed8" : "#334155";
  const label = relationship.label || labelForRelationshipKind(relationship.kind);

  return (
    <>
      <defs>
        {hasEndTriangle ? (
          <marker
            id={markerEndId}
            markerHeight="16"
            markerWidth="16"
            orient="auto"
            refX="14"
            refY="8"
            viewBox="0 0 16 16"
          >
            <path d="M 2 2 L 14 8 L 2 14 z" fill="#ffffff" stroke={strokeColor} strokeWidth="1.5" />
          </marker>
        ) : null}
        {hasEndArrow ? (
          <marker
            id={markerEndId}
            markerHeight="12"
            markerWidth="12"
            orient="auto"
            refX="11"
            refY="6"
            viewBox="0 0 12 12"
          >
            <path d="M 2 2 L 10 6 L 2 10" fill="none" stroke={strokeColor} strokeWidth="1.8" />
          </marker>
        ) : null}
        {hasStartMarker ? (
          <marker
            id={markerStartId}
            markerHeight="18"
            markerWidth="18"
            orient="auto-start-reverse"
            refX="2"
            refY="9"
            viewBox="0 0 18 18"
          >
            <path
              d="M 2 9 L 8 2 L 16 9 L 8 16 z"
              fill={isComposition ? strokeColor : "#ffffff"}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          </marker>
        ) : null}
      </defs>
      <path
        id={id}
        className="react-flow__edge-path uml-relationship-path"
        d={edgePath}
        fill="none"
        markerEnd={hasEndTriangle || hasEndArrow ? `url(#${markerEndId})` : undefined}
        markerStart={hasStartMarker ? `url(#${markerStartId})` : undefined}
        style={{
          stroke: strokeColor,
          strokeDasharray: isDashed ? "7 5" : undefined,
          strokeWidth: selected ? 2.6 : 2,
        }}
      />
      <path
        className="react-flow__edge-interaction"
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={28}
        onPointerDown={(event) => {
          event.stopPropagation();
          relationship.onSelect?.(id);
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={selected ? "uml-edge-label uml-edge-label-selected" : "uml-edge-label"}
          onPointerDown={(event) => {
            event.stopPropagation();
            relationship.onSelect?.(id);
          }}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
        >
          {relationship.sourceMultiplicity ? (
            <span className="uml-edge-multiplicity">{relationship.sourceMultiplicity}</span>
          ) : null}
          <span>{label}</span>
          {relationship.targetMultiplicity ? (
            <span className="uml-edge-multiplicity">{relationship.targetMultiplicity}</span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function UmlMemberSection({ fallback, members }: { fallback: string; members: UmlMember[] }) {
  return (
    <div className="uml-class-section">
      {members.length > 0 ? (
        members.map((member) => (
          <div key={member.id}>
            {member.visibility} {member.signature || "unnamed"}
          </div>
        ))
      ) : (
        <div className="uml-empty-member">{fallback}</div>
      )}
    </div>
  );
}

function createMember(visibility: UmlVisibility, signature: string): UmlMember {
  return {
    id: crypto.randomUUID(),
    signature,
    visibility,
  };
}

function labelForClassKind(kind: UmlClassKind): string {
  const labels: Record<UmlClassKind, string> = {
    abstract: "Abstract Class",
    class: "Class",
    enum: "Enum",
    interface: "Interface",
  };

  return labels[kind];
}

function labelForRelationshipKind(kind: UmlRelationshipKind): string {
  const labels: Record<UmlRelationshipKind, string> = {
    aggregation: "Aggregation",
    association: "Association",
    composition: "Composition",
    dependency: "Dependency",
    implementation: "Implementation",
    inheritance: "Inheritance",
  };

  return labels[kind];
}

function descriptionForRelationshipKind(kind: UmlRelationshipKind): string {
  const descriptions: Record<UmlRelationshipKind, string> = {
    aggregation: "Has-a relationship where the part can live independently.",
    association: "General knows-about or works-with relationship.",
    composition: "Strong has-a relationship where the part lifecycle belongs to the whole.",
    dependency: "Temporary uses relationship, often a method parameter or external collaborator.",
    implementation: "Is-a contract relationship from class to interface.",
    inheritance: "Is-a relationship from subclass to base class.",
  };

  return descriptions[kind];
}

function labelForSeverity(severity: LLDSuggestion["severity"]): string {
  const labels: Record<LLDSuggestion["severity"], string> = {
    critical: "Critical",
    info: "Suggestion",
    warning: "Warning",
  };

  return labels[severity];
}

function formatUpdatedAt(updatedAt: string): string {
  const parsedDate = new Date(updatedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return updatedAt;
  }

  return parsedDate.toLocaleString();
}

function readLLDDraft(): LLDDraft {
  const storedValue = localStorage.getItem(lldDraftStorageKey);

  if (!storedValue) {
    return getDefaultLLDDraft();
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (Array.isArray(parsedValue) && parsedValue.every(isUmlClass)) {
      return {
        classes: parsedValue,
        relationships: [],
      };
    }

    if (isLLDDraft(parsedValue)) {
      return parsedValue;
    }

    return getDefaultLLDDraft();
  } catch {
    return getDefaultLLDDraft();
  }
}

function readSelectedClassId(): string | null {
  return localStorage.getItem(lldSelectedClassStorageKey) ?? "class-order-service";
}

function isUmlClass(value: unknown): value is UmlClass {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<UmlClass>;

  return (
    typeof candidate.id === "string" &&
    isUmlClassKind(candidate.kind) &&
    typeof candidate.name === "string" &&
    isPosition(candidate.position) &&
    Array.isArray(candidate.attributes) &&
    candidate.attributes.every(isUmlMember) &&
    Array.isArray(candidate.methods) &&
    candidate.methods.every(isUmlMember) &&
    typeof candidate.responsibility === "string"
  );
}

function isUmlRelationship(value: unknown): value is UmlRelationship {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<UmlRelationship>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.sourceClassId === "string" &&
    typeof candidate.targetClassId === "string" &&
    (candidate.sourceHandleId === undefined || isUmlHandleId(candidate.sourceHandleId)) &&
    (candidate.targetHandleId === undefined || isUmlHandleId(candidate.targetHandleId)) &&
    isUmlRelationshipKind(candidate.kind) &&
    typeof candidate.label === "string" &&
    typeof candidate.sourceMultiplicity === "string" &&
    typeof candidate.targetMultiplicity === "string"
  );
}

function isLLDDraft(value: unknown): value is LLDDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LLDDraft>;

  return (
    Array.isArray(candidate.classes) &&
    candidate.classes.every(isUmlClass) &&
    Array.isArray(candidate.relationships) &&
    candidate.relationships.every(isUmlRelationship)
  );
}

function isUmlMember(value: unknown): value is UmlMember {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<UmlMember>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.signature === "string" &&
    isUmlVisibility(candidate.visibility)
  );
}

function isPosition(value: unknown): value is UmlClass["position"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<UmlClass["position"]>;
  return typeof candidate.x === "number" && typeof candidate.y === "number";
}

function isUmlClassKind(value: unknown): value is UmlClassKind {
  return typeof value === "string" && classKinds.includes(value as UmlClassKind);
}

function isUmlRelationshipKind(value: unknown): value is UmlRelationshipKind {
  return typeof value === "string" && relationshipKinds.includes(value as UmlRelationshipKind);
}

function isUmlHandleId(value: unknown): value is UmlHandleId {
  return typeof value === "string" && umlHandleIds.includes(value as UmlHandleId);
}

function isUmlVisibility(value: unknown): value is UmlVisibility {
  return typeof value === "string" && visibilities.includes(value as UmlVisibility);
}

function handlesForRelationship(
  relationship: UmlRelationship,
  classes: UmlClass[],
): { source: UmlHandleId; target: UmlHandleId } {
  if (relationship.sourceHandleId && relationship.targetHandleId) {
    return {
      source: relationship.sourceHandleId,
      target: relationship.targetHandleId,
    };
  }

  const sourceClass = classes.find((umlClass) => umlClass.id === relationship.sourceClassId);
  const targetClass = classes.find((umlClass) => umlClass.id === relationship.targetClassId);

  if (!sourceClass || !targetClass) {
    return { source: "right", target: "left" };
  }

  const deltaX = targetClass.position.x - sourceClass.position.x;
  const deltaY = targetClass.position.y - sourceClass.position.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return deltaX >= 0
      ? { source: "right", target: "left" }
      : { source: "left", target: "right" };
  }

  return deltaY >= 0
    ? { source: "bottom", target: "top" }
    : { source: "top", target: "bottom" };
}
