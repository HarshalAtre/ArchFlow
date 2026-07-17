import { toPng } from "html-to-image";
import { getViewportForBounds, type Rect } from "@xyflow/react";

import type {
  BoardEdge,
  BoardElement,
  BoardElementType,
  BoardGraph,
} from "../types/board";
import type {
  LLDDraft,
  UmlClass,
  UmlClassKind,
  UmlHandleId,
  UmlMember,
  UmlRelationship,
  UmlRelationshipKind,
  UmlVisibility,
} from "../types/lld";

type HLDTransferFile = {
  format: "archflow-board";
  graph: BoardGraph;
  mode: "hld";
  name: string;
  version: 1;
};

type LLDTransferFile = {
  format: "archflow-board";
  graph: LLDDraft;
  mode: "lld";
  name: string;
  version: 1;
};

export type ArchFlowTransferFile = HLDTransferFile | LLDTransferFile;

const boardElementTypes: BoardElementType[] = [
  "client",
  "service",
  "database",
  "queue",
  "cache",
  "external-api",
  "load-balancer",
  "api-gateway",
  "text",
];
const classKinds: UmlClassKind[] = ["class", "abstract", "interface", "enum"];
const relationshipKinds: UmlRelationshipKind[] = [
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition",
];
const handleIds: UmlHandleId[] = ["top", "right", "bottom", "left"];
const visibilities: UmlVisibility[] = ["+", "-", "#", "~"];

export function createHLDTransferFile(name: string, graph: BoardGraph): HLDTransferFile {
  return {
    format: "archflow-board",
    graph,
    mode: "hld",
    name: normalizedBoardName(name, "Untitled Architecture"),
    version: 1,
  };
}

export function createLLDTransferFile(name: string, graph: LLDDraft): LLDTransferFile {
  return {
    format: "archflow-board",
    graph,
    mode: "lld",
    name: normalizedBoardName(name, "Untitled LLD"),
    version: 1,
  };
}

export async function readTransferFile(file: File): Promise<ArchFlowTransferFile> {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(await file.text());
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!isTransferFile(parsedValue)) {
    throw new Error("The selected file is not a valid ArchFlow board export.");
  }

  return parsedValue;
}

export function downloadTransferFile(transferFile: ArchFlowTransferFile): void {
  downloadBlob(
    new Blob([JSON.stringify(transferFile, null, 2)], {
      type: "application/json",
    }),
    `${safeFileName(transferFile.name)}-${transferFile.mode}.json`,
  );
}

export async function exportDiagramAsPng(
  canvasElement: HTMLElement,
  boardName: string,
  bounds: Rect,
): Promise<void> {
  const dataUrl = await captureCanvas(canvasElement, bounds);
  downloadDataUrl(dataUrl, `${safeFileName(boardName)}.png`);
}

export async function exportDiagramAsPdf(
  canvasElement: HTMLElement,
  boardName: string,
  bounds: Rect,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const dataUrl = await captureCanvas(canvasElement, bounds);
  const image = await loadImage(dataUrl);
  const orientation = image.width >= image.height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    format: "a4",
    orientation,
    unit: "pt",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const scale = Math.min(
    (pageWidth - margin * 2) / image.width,
    (pageHeight - margin * 2) / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;

  pdf.addImage(
    dataUrl,
    "PNG",
    (pageWidth - width) / 2,
    (pageHeight - height) / 2,
    width,
    height,
  );
  pdf.save(`${safeFileName(boardName)}.pdf`);
}

function isTransferFile(value: unknown): value is ArchFlowTransferFile {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.format !== "archflow-board" ||
    value.version !== 1 ||
    typeof value.name !== "string"
  ) {
    return false;
  }

  if (value.mode === "hld") {
    return isBoardGraph(value.graph);
  }

  if (value.mode === "lld") {
    return isLLDDraft(value.graph);
  }

  return false;
}

function isBoardGraph(value: unknown): value is BoardGraph {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !Array.isArray(value.elements) ||
    !value.elements.every(isBoardElement) ||
    !Array.isArray(value.edges) ||
    !value.edges.every(isBoardEdge)
  ) {
    return false;
  }

  const elementIds = new Set(value.elements.map((element) => element.id));
  return value.edges.every(
    (edge) =>
      elementIds.has(edge.sourceElementId) && elementIds.has(edge.targetElementId),
  );
}

function isBoardElement(value: unknown): value is BoardElement {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    boardElementTypes.includes(value.type as BoardElementType) &&
    typeof value.label === "string" &&
    isPosition(value.position) &&
    isSize(value.size) &&
    (value.metadata === undefined || isRecord(value.metadata))
  );
}

function isBoardEdge(value: unknown): value is BoardEdge {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.sourceElementId === "string" &&
    typeof value.targetElementId === "string" &&
    (value.label === undefined || typeof value.label === "string") &&
    (value.metadata === undefined || isRecord(value.metadata))
  );
}

function isLLDDraft(value: unknown): value is LLDDraft {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !Array.isArray(value.classes) ||
    !value.classes.every(isUmlClass) ||
    !Array.isArray(value.relationships) ||
    !value.relationships.every(isUmlRelationship)
  ) {
    return false;
  }

  const classIds = new Set(value.classes.map((umlClass) => umlClass.id));
  return value.relationships.every(
    (relationship) =>
      classIds.has(relationship.sourceClassId) &&
      classIds.has(relationship.targetClassId),
  );
}

function isUmlClass(value: unknown): value is UmlClass {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    classKinds.includes(value.kind as UmlClassKind) &&
    typeof value.name === "string" &&
    isPosition(value.position) &&
    Array.isArray(value.attributes) &&
    value.attributes.every(isUmlMember) &&
    Array.isArray(value.methods) &&
    value.methods.every(isUmlMember) &&
    typeof value.responsibility === "string"
  );
}

function isUmlRelationship(value: unknown): value is UmlRelationship {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.sourceClassId === "string" &&
    typeof value.targetClassId === "string" &&
    (value.sourceHandleId === undefined ||
      handleIds.includes(value.sourceHandleId as UmlHandleId)) &&
    (value.targetHandleId === undefined ||
      handleIds.includes(value.targetHandleId as UmlHandleId)) &&
    relationshipKinds.includes(value.kind as UmlRelationshipKind) &&
    typeof value.label === "string" &&
    typeof value.sourceMultiplicity === "string" &&
    typeof value.targetMultiplicity === "string"
  );
}

function isUmlMember(value: unknown): value is UmlMember {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.signature === "string" &&
    visibilities.includes(value.visibility as UmlVisibility)
  );
}

function isPosition(value: unknown): value is { x: number; y: number } {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  );
}

function isSize(value: unknown): value is { height: number; width: number } {
  return (
    isRecord(value) &&
    typeof value.height === "number" &&
    Number.isFinite(value.height) &&
    value.height > 0 &&
    typeof value.width === "number" &&
    Number.isFinite(value.width) &&
    value.width > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function captureCanvas(canvasElement: HTMLElement, bounds: Rect): Promise<string> {
  const viewportElement = canvasElement.querySelector<HTMLElement>(".react-flow__viewport");

  if (!viewportElement || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error("Add at least one diagram item before exporting.");
  }

  const { width, height } = exportDimensions(bounds);
  const viewport = getViewportForBounds(bounds, width, height, 0.1, 1, 0.08);
  const backgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-paper-2")
    .trim();

  return toPng(viewportElement, {
    backgroundColor: backgroundColor || "oklch(96.5% 0.007 250)",
    cacheBust: true,
    height,
    pixelRatio: 2,
    style: {
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      width: `${width}px`,
    },
    width,
  });
}

function exportDimensions(bounds: Rect): { height: number; width: number } {
  const contentRatio = bounds.width / bounds.height;
  const width = clamp(Math.ceil(bounds.width + 160), 1200, 2400);
  const preferredHeight = width / contentRatio;

  return {
    height: clamp(Math.ceil(preferredHeight), 800, 1800),
    width,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizedBoardName(name: string, fallback: string): string {
  return name.trim() || fallback;
}

function safeFileName(name: string): string {
  const sanitizedName = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitizedName || "archflow-board";
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, fileName: string): void {
  const anchor = document.createElement("a");

  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not prepare the diagram for PDF export."));
    image.src = dataUrl;
  });
}
