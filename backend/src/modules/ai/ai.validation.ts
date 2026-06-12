import type {
  HLDAnalysisSuggestion,
  LLDAnalysisSuggestion,
} from "../../types/ai.js";
import type { BoardElementType, BoardGraph } from "../../types/board.js";
import type {
  LLDGraph,
  UmlClassKind,
  UmlRelationshipKind,
} from "../../types/lld.js";

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
const hldSuggestionTypes = [
  "missing-component",
  "scalability",
  "performance",
  "reliability",
  "security",
] as const;
const hldSeverities = ["low", "medium", "high"] as const;
const classKinds: UmlClassKind[] = ["class", "abstract", "interface", "enum"];
const relationshipKinds: UmlRelationshipKind[] = [
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition",
];
const lldSeverities = ["info", "warning", "critical"] as const;

export function sanitizeHLDAnalysis(
  value: unknown,
  graph: BoardGraph,
): HLDAnalysisSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.suggestions)) {
    throw new Error("AI returned an invalid HLD analysis.");
  }

  const elementIds = new Set(graph.elements.map((element) => element.id));

  return value.suggestions
    .slice(0, 8)
    .map((rawSuggestion, index) => {
      if (
        !isRecord(rawSuggestion) ||
        !includesString(hldSuggestionTypes, rawSuggestion.type) ||
        !includesString(hldSeverities, rawSuggestion.severity)
      ) {
        return null;
      }

      const title = cleanText(rawSuggestion.title, 100);
      const description = cleanText(rawSuggestion.description, 400);

      if (!title || !description) {
        return null;
      }

      const suggestion: HLDAnalysisSuggestion = {
        id: `ai-hld-${index}-${slugFor(title)}`,
        type: rawSuggestion.type,
        severity: rawSuggestion.severity,
        title,
        description,
        relatedElementIds: existingIds(rawSuggestion.relatedElementIds, elementIds),
      };

      if (
        rawSuggestion.actionKind === "add-element" &&
        includesString(boardElementTypes, rawSuggestion.elementType)
      ) {
        suggestion.action = {
          kind: "add-element",
          elementType: rawSuggestion.elementType,
          label:
            cleanText(rawSuggestion.elementLabel, 80) ||
            defaultLabelForElementType(rawSuggestion.elementType),
          connectFromElementIds: existingIds(
            rawSuggestion.connectFromElementIds,
            elementIds,
          ),
          connectToElementIds: existingIds(
            rawSuggestion.connectToElementIds,
            elementIds,
          ),
        };
      }

      return suggestion;
    })
    .filter((suggestion): suggestion is HLDAnalysisSuggestion => suggestion !== null);
}

export function sanitizeLLDAnalysis(
  value: unknown,
  graph: LLDGraph,
): LLDAnalysisSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.suggestions)) {
    throw new Error("AI returned an invalid LLD analysis.");
  }

  const classIds = new Set(graph.classes.map((umlClass) => umlClass.id));
  const classById = new Map(graph.classes.map((umlClass) => [umlClass.id, umlClass]));

  return value.suggestions
    .slice(0, 8)
    .map((rawSuggestion, index) => {
      if (!isRecord(rawSuggestion)) {
        return null;
      }

      const severity = normalizeLLDSeverity(rawSuggestion.severity);
      const title = cleanText(rawSuggestion.title, 100);
      const description = cleanText(rawSuggestion.description, 400);

      if (!severity || !title || !description) {
        return null;
      }

      const suggestion: LLDAnalysisSuggestion = {
        id: `ai-lld-${index}-${slugFor(title)}`,
        severity,
        title,
        description,
        relatedClassIds: existingIds(rawSuggestion.relatedClassIds, classIds),
      };

      if (
        rawSuggestion.actionKind === "add-type" &&
        includesString(classKinds, rawSuggestion.classKind) &&
        typeof rawSuggestion.anchorClassId === "string" &&
        classIds.has(rawSuggestion.anchorClassId)
      ) {
        const name = cleanTypeName(rawSuggestion.typeName);

        if (name) {
          const relationship = normalizeAddedTypeRelationship(
            rawSuggestion.classKind,
            rawSuggestion.relationshipDirection,
            rawSuggestion.relationshipKind,
            classById.get(rawSuggestion.anchorClassId)?.kind,
          );

          suggestion.action = {
            kind: "add-type",
            classKind: rawSuggestion.classKind,
            name,
            responsibility: cleanText(rawSuggestion.responsibility, 240),
            attributes: cleanMemberArray(rawSuggestion.attributes, 8, 120),
            methods: cleanMemberArray(rawSuggestion.methods, 8, 140),
            anchorClassId: rawSuggestion.anchorClassId,
            relationshipDirection: relationship.direction,
            relationshipKind: relationship.kind,
            relationshipLabel:
              cleanText(rawSuggestion.relationshipLabel, 80) ||
              defaultAddedTypeRelationshipLabel(relationship.kind),
          };
        }
      }

      if (
        rawSuggestion.actionKind === "add-relationship" &&
        typeof rawSuggestion.sourceClassId === "string" &&
        typeof rawSuggestion.targetClassId === "string" &&
        rawSuggestion.sourceClassId !== rawSuggestion.targetClassId &&
        classIds.has(rawSuggestion.sourceClassId) &&
        classIds.has(rawSuggestion.targetClassId) &&
        includesString(relationshipKinds, rawSuggestion.relationshipKind) &&
        isValidNewRelationship(
          graph,
          classById,
          rawSuggestion.sourceClassId,
          rawSuggestion.targetClassId,
          rawSuggestion.relationshipKind,
        )
      ) {
        suggestion.action = {
          kind: "add-relationship",
          sourceClassId: rawSuggestion.sourceClassId,
          targetClassId: rawSuggestion.targetClassId,
          relationshipKind: rawSuggestion.relationshipKind,
          label: cleanText(rawSuggestion.relationshipLabel, 80),
        };
      }

      return suggestion;
    })
    .filter((suggestion): suggestion is LLDAnalysisSuggestion => suggestion !== null);
}

function isValidAddedTypeRelationship(
  newClassKind: UmlClassKind,
  direction: "existing-to-new" | "new-to-existing",
  relationshipKind: UmlRelationshipKind,
  anchorClassKind: UmlClassKind | undefined,
): boolean {
  if (!anchorClassKind) {
    return false;
  }

  if (relationshipKind === "implementation") {
    return direction === "new-to-existing" && anchorClassKind === "interface";
  }

  if (relationshipKind === "inheritance") {
    return (
      direction === "new-to-existing" &&
      (anchorClassKind === "class" || anchorClassKind === "abstract")
    );
  }

  return newClassKind !== "enum" || relationshipKind === "association";
}

function normalizeAddedTypeRelationship(
  newClassKind: UmlClassKind,
  direction: unknown,
  kind: unknown,
  anchorClassKind: UmlClassKind | undefined,
): {
  direction: "existing-to-new" | "new-to-existing";
  kind: UmlRelationshipKind;
} {
  if (
    includesString(
      ["existing-to-new", "new-to-existing"] as const,
      direction,
    ) &&
    includesString(relationshipKinds, kind) &&
    isValidAddedTypeRelationship(newClassKind, direction, kind, anchorClassKind)
  ) {
    return {
      direction:
        kind === "implementation" || kind === "inheritance"
          ? "new-to-existing"
          : "existing-to-new",
      kind,
    };
  }

  return {
    direction: "existing-to-new",
    kind: "association",
  };
}

function defaultAddedTypeRelationshipLabel(kind: UmlRelationshipKind): string {
  const labels: Record<UmlRelationshipKind, string> = {
    aggregation: "has",
    association: "uses",
    composition: "owns",
    dependency: "depends on",
    implementation: "implements",
    inheritance: "extends",
  };

  return labels[kind];
}

function isValidNewRelationship(
  graph: LLDGraph,
  classById: Map<string, LLDGraph["classes"][number]>,
  sourceClassId: string,
  targetClassId: string,
  kind: UmlRelationshipKind,
): boolean {
  const targetClass = classById.get(targetClassId);
  const alreadyConnected = graph.relationships.some(
    (relationship) =>
      relationship.sourceClassId === sourceClassId &&
      relationship.targetClassId === targetClassId,
  );

  if (!targetClass || alreadyConnected) {
    return false;
  }

  if (kind === "implementation") {
    return targetClass.kind === "interface";
  }

  if (kind === "inheritance") {
    return targetClass.kind === "class" || targetClass.kind === "abstract";
  }

  return true;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanTypeName(value: unknown): string {
  const name = cleanText(value, 80).replace(/[^A-Za-z0-9_$]/g, "");
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : "";
}

function cleanStringArray(value: unknown, limit: number, maxLength: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, limit);
}

function cleanMemberArray(
  value: unknown,
  limit: number,
  maxLength: number,
): string[] {
  return cleanStringArray(value, limit, maxLength)
    .map((member) => member.replace(/^[+\-#~]\s*/, "").trim())
    .filter(Boolean);
}

function existingIds(value: unknown, ids: Set<string>): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter((item): item is string => typeof item === "string" && ids.has(item)),
    ),
  ].slice(0, 12);
}

function includesString<T extends string>(
  values: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function normalizeLLDSeverity(
  value: unknown,
): (typeof lldSeverities)[number] | null {
  if (includesString(lldSeverities, value)) {
    return value;
  }

  if (value === "low") {
    return "info";
  }

  if (value === "medium") {
    return "warning";
  }

  if (value === "high") {
    return "critical";
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function slugFor(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function defaultLabelForElementType(type: BoardElementType): string {
  const labels: Record<BoardElementType, string> = {
    "api-gateway": "API Gateway",
    cache: "Cache",
    client: "Client",
    database: "Database",
    "external-api": "External API",
    "load-balancer": "Load Balancer",
    queue: "Queue",
    service: "Service",
    text: "Note",
  };

  return labels[type];
}
