import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Node,
  NodeChange,
  NodeProps,
  NodeTypes,
  Position,
  ReactFlow,
  applyNodeChanges,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";

type UmlVisibility = "+" | "-" | "#" | "~";

type UmlMember = {
  id: string;
  signature: string;
  visibility: UmlVisibility;
};

type UmlClassKind = "class" | "abstract" | "interface" | "enum";

type UmlClass = {
  id: string;
  kind: UmlClassKind;
  name: string;
  position: {
    x: number;
    y: number;
  };
  attributes: UmlMember[];
  methods: UmlMember[];
  responsibility: string;
};

type UmlNodeData = {
  attributes: UmlMember[];
  kind: UmlClassKind;
  methods: UmlMember[];
  name: string;
};

type UmlNode = Node<UmlNodeData, "uml-class">;

const umlNodeTypes: NodeTypes = {
  "uml-class": UmlClassNode,
};

const initialClasses: UmlClass[] = [
  {
    id: "class-order-service",
    kind: "class",
    name: "OrderService",
    position: { x: 120, y: 120 },
    attributes: [
      createMember("-", "orderRepository: OrderRepository"),
      createMember("-", "paymentGateway: PaymentGateway"),
    ],
    methods: [
      createMember("+", "createOrder(request: OrderRequest): Order"),
      createMember("+", "cancelOrder(orderId: string): void"),
    ],
    responsibility: "Coordinates order lifecycle operations and delegates persistence/payment work.",
  },
  {
    id: "class-order",
    kind: "class",
    name: "Order",
    position: { x: 520, y: 120 },
    attributes: [
      createMember("-", "id: string"),
      createMember("-", "status: OrderStatus"),
      createMember("-", "items: OrderItem[]"),
    ],
    methods: [
      createMember("+", "addItem(item: OrderItem): void"),
      createMember("+", "markPaid(): void"),
    ],
    responsibility: "Domain entity that owns order state transitions.",
  },
  {
    id: "interface-payment-gateway",
    kind: "interface",
    name: "PaymentGateway",
    position: { x: 900, y: 140 },
    attributes: [],
    methods: [createMember("+", "charge(amount: Money): PaymentResult")],
    responsibility: "Boundary for payment provider integrations.",
  },
];

const classKinds: UmlClassKind[] = ["class", "abstract", "interface", "enum"];
const lldDraftStorageKey = "archflow:lld-draft";
const lldSelectedClassStorageKey = "archflow:lld-selected-class";
const visibilities: UmlVisibility[] = ["+", "-", "#", "~"];

export function LldPage() {
  const [classes, setClasses] = useState<UmlClass[]>(() => readLldDraft());
  const [selectedClassId, setSelectedClassId] = useState<string | null>(() => readSelectedClassId());

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

  const selectedClass = classes.find((umlClass) => umlClass.id === selectedClassId);

  useEffect(() => {
    localStorage.setItem(lldDraftStorageKey, JSON.stringify(classes));
  }, [classes]);

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
    const nextNodes = applyNodeChanges(changes, nodes);

    setClasses((currentClasses) =>
      currentClasses.map((umlClass) => {
        const matchingNode = nextNodes.find((node) => node.id === umlClass.id);
        return matchingNode
          ? {
              ...umlClass,
              position: matchingNode.position,
            }
          : umlClass;
      }),
    );
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

    setClasses((currentClasses) => [...currentClasses, nextClass]);
    setSelectedClassId(nextClass.id);
  };

  const updateSelectedClass = (updates: Partial<UmlClass>) => {
    if (!selectedClassId) {
      return;
    }

    setClasses((currentClasses) =>
      currentClasses.map((umlClass) =>
        umlClass.id === selectedClassId ? { ...umlClass, ...updates } : umlClass,
      ),
    );
  };

  const deleteSelectedClass = () => {
    if (!selectedClassId) {
      return;
    }

    setClasses((currentClasses) => currentClasses.filter((umlClass) => umlClass.id !== selectedClassId));
    setSelectedClassId(null);
  };

  return (
    <main className="app-shell lld-shell">
      <aside className="toolbar">
        <div>
          <p className="eyebrow">LLD Practice</p>
          <h1>UML Class Designer</h1>
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
          <span className="section-label">Notation</span>
          <p className="status-text">+ public, - private, # protected, ~ package/internal.</p>
          <p className="status-text">Relationships like is-a, has-a, composition, and implementation come next.</p>
        </div>
      </aside>

      <section className="board-canvas">
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={umlNodeTypes}
          onNodesChange={handleNodesChange}
          onNodeClick={(_, node) => setSelectedClassId(node.id)}
          onPaneClick={() => setSelectedClassId(null)}
          fitView
        >
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </section>

      <aside className="context-panel">
        <LldContextPanel
          selectedClass={selectedClass}
          onClassChange={updateSelectedClass}
          onDeleteClass={deleteSelectedClass}
        />
      </aside>
    </main>
  );
}

type LldContextPanelProps = {
  selectedClass: UmlClass | undefined;
  onClassChange: (updates: Partial<UmlClass>) => void;
  onDeleteClass: () => void;
};

function LldContextPanel({
  selectedClass,
  onClassChange,
  onDeleteClass,
}: LldContextPanelProps) {
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
      <Handle type="target" position={Position.Left} />
      <div className="uml-class-header">
        {data.kind === "interface" ? <span>&lt;&lt;interface&gt;&gt;</span> : null}
        {data.kind === "abstract" ? <span>&lt;&lt;abstract&gt;&gt;</span> : null}
        {data.kind === "enum" ? <span>&lt;&lt;enum&gt;&gt;</span> : null}
        <strong>{data.name || "UnnamedType"}</strong>
      </div>
      <UmlMemberSection members={data.attributes} fallback="- attributes" />
      <UmlMemberSection members={data.methods} fallback="+ methods()" />
      <Handle type="source" position={Position.Right} />
    </div>
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

function readLldDraft(): UmlClass[] {
  const storedValue = localStorage.getItem(lldDraftStorageKey);

  if (!storedValue) {
    return initialClasses;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) && parsedValue.every(isUmlClass) ? parsedValue : initialClasses;
  } catch {
    return initialClasses;
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

function isUmlVisibility(value: unknown): value is UmlVisibility {
  return typeof value === "string" && visibilities.includes(value as UmlVisibility);
}
