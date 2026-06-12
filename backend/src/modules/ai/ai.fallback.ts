import { analyzeArchitecture } from "../architecture/architecture.service.js";
import type {
  HLDAnalysisSuggestion,
  LLDAnalysisSuggestion,
} from "../../types/ai.js";
import type { BoardGraph } from "../../types/board.js";
import type { LLDGraph } from "../../types/lld.js";

export function fallbackHLDAnalysis(graph: BoardGraph): HLDAnalysisSuggestion[] {
  return analyzeArchitecture(graph).map((suggestion) => ({
    id: suggestion.id,
    type: suggestion.type,
    severity: suggestion.severity,
    title: suggestion.title,
    description: suggestion.description,
    relatedElementIds: suggestion.relatedElementIds,
    action: suggestion.suggestedElementType
      ? {
          kind: "add-element",
          elementType: suggestion.suggestedElementType,
          label: labelForElementType(suggestion.suggestedElementType),
          connectFromElementIds: sourceIdsForSuggestion(
            graph,
            suggestion.suggestedElementType,
            suggestion.relatedElementIds,
          ),
          connectToElementIds: targetIdsForSuggestion(
            graph,
            suggestion.suggestedElementType,
            suggestion.relatedElementIds,
          ),
        }
      : undefined,
  }));
}

export function fallbackLLDAnalysis(graph: LLDGraph): LLDAnalysisSuggestion[] {
  const suggestions: LLDAnalysisSuggestion[] = [];
  const classById = new Map(graph.classes.map((umlClass) => [umlClass.id, umlClass]));

  if (graph.classes.length < 3) {
    suggestions.push({
      id: "missing-core-types",
      severity: "info",
      title: "Add enough collaborating types",
      description:
        "A useful LLD usually includes entities, services, contracts, and value objects.",
      relatedClassIds: graph.classes.map((umlClass) => umlClass.id),
    });
  }

  for (const umlClass of graph.classes) {
    if (!umlClass.responsibility.trim()) {
      suggestions.push({
        id: `missing-responsibility-${umlClass.id}`,
        severity: "warning",
        title: `${umlClass.name} needs a responsibility`,
        description:
          "Define what this type owns and the reason it should change to make SRP explicit.",
        relatedClassIds: [umlClass.id],
      });
    }

    if (umlClass.kind === "interface" && umlClass.methods.length === 0) {
      suggestions.push({
        id: `empty-interface-${umlClass.id}`,
        severity: "warning",
        title: `${umlClass.name} is an empty interface`,
        description: "Add operations that express a useful contract.",
        relatedClassIds: [umlClass.id],
      });
    }

    if (umlClass.attributes.length > 6 || umlClass.methods.length > 7) {
      suggestions.push({
        id: `large-type-${umlClass.id}`,
        severity: "warning",
        title: `${umlClass.name} may be doing too much`,
        description:
          "Many fields or operations can indicate weak cohesion and mixed responsibilities.",
        relatedClassIds: [umlClass.id],
      });
    }
  }

  for (const umlClass of graph.classes.filter((item) => item.kind !== "enum")) {
    const connected = graph.relationships.some(
      (relationship) =>
        relationship.sourceClassId === umlClass.id ||
        relationship.targetClassId === umlClass.id,
    );

    if (!connected) {
      suggestions.push({
        id: `isolated-type-${umlClass.id}`,
        severity: "info",
        title: `${umlClass.name} is isolated`,
        description: "Show how this type collaborates with the rest of the design.",
        relatedClassIds: [umlClass.id],
      });
    }
  }

  for (const relationship of graph.relationships) {
    const sourceClass = classById.get(relationship.sourceClassId);
    const targetClass = classById.get(relationship.targetClassId);

    if (!sourceClass || !targetClass) {
      continue;
    }

    if (relationship.kind === "implementation" && targetClass.kind !== "interface") {
      suggestions.push({
        id: `implementation-target-${relationship.id}`,
        severity: "critical",
        title: `${sourceClass.name} implements a non-interface`,
        description:
          "Implementation should target an interface. Use inheritance or association otherwise.",
        relatedClassIds: [sourceClass.id, targetClass.id],
      });
    }

    if (relationship.kind === "inheritance" && targetClass.kind === "interface") {
      suggestions.push({
        id: `inheritance-interface-${relationship.id}`,
        severity: "warning",
        title: `${sourceClass.name} should implement ${targetClass.name}`,
        description:
          "Use implementation for an interface contract and inheritance for a base class.",
        relatedClassIds: [sourceClass.id, targetClass.id],
      });
    }
  }

  const hasStatusField = graph.classes.some((umlClass) =>
    umlClass.attributes.some((attribute) => /status|state/i.test(attribute.signature)),
  );

  if (hasStatusField && !graph.classes.some((umlClass) => umlClass.kind === "enum")) {
    const statusOwner = graph.classes.find((umlClass) =>
      umlClass.attributes.some((attribute) => /status|state/i.test(attribute.signature)),
    );

    if (!statusOwner) {
      return suggestions.slice(0, 8);
    }

    suggestions.push({
      id: "missing-status-enum",
      severity: "info",
      title: "Model status or state as an enum",
      description: "Make valid lifecycle states explicit with an enum.",
      relatedClassIds: [],
      action: {
        kind: "add-type",
        classKind: "enum",
        name: "Status",
        responsibility: "Defines the valid lifecycle states.",
        attributes: ["CREATED", "ACTIVE", "COMPLETED"],
        methods: [],
        anchorClassId: statusOwner.id,
        relationshipDirection: "existing-to-new",
        relationshipKind: "association",
        relationshipLabel: "has status",
      },
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "healthy-design-baseline",
      severity: "info",
      title: "The design has a healthy baseline",
      description:
        "Types have responsibilities and participate in valid relationships. Continue by explaining key invariants, dependency direction, and trade-offs in an interview.",
      relatedClassIds: graph.classes.map((umlClass) => umlClass.id).slice(0, 8),
    });
  }

  return suggestions.slice(0, 8);
}

function sourceIdsForSuggestion(
  graph: BoardGraph,
  type: string,
  relatedElementIds: string[],
): string[] {
  if (type === "api-gateway" || type === "load-balancer") {
    return idsOfTypes(graph, relatedElementIds, ["client"]);
  }

  if (type === "database" || type === "cache" || type === "queue") {
    return idsOfTypes(graph, relatedElementIds, ["service"]);
  }

  return [];
}

function targetIdsForSuggestion(
  graph: BoardGraph,
  type: string,
  relatedElementIds: string[],
): string[] {
  if (type === "api-gateway" || type === "load-balancer") {
    return idsOfTypes(graph, relatedElementIds, ["service"]);
  }

  if (type === "cache") {
    return idsOfTypes(graph, relatedElementIds, ["database"]);
  }

  return [];
}

function idsOfTypes(
  graph: BoardGraph,
  relatedElementIds: string[],
  types: string[],
): string[] {
  const relatedIds = new Set(relatedElementIds);

  return graph.elements
    .filter((element) => relatedIds.has(element.id) && types.includes(element.type))
    .map((element) => element.id);
}

function labelForElementType(type: string): string {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
