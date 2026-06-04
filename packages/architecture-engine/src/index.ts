import type {
  ArchitectureSuggestion,
  BoardElement,
  BoardElementType,
  BoardGraph,
} from "@visual-arch-board/shared";

type Layer = {
  types: BoardElementType[];
  y: number;
};

const LAYERS: Layer[] = [
  { types: ["client"], y: 80 },
  { types: ["load-balancer", "api-gateway"], y: 220 },
  { types: ["service"], y: 360 },
  { types: ["cache", "queue", "database"], y: 520 },
  { types: ["external-api"], y: 680 },
  { types: ["text"], y: 820 },
];

export function cleanupArchitectureLayout(graph: BoardGraph): BoardGraph {
  const positionedElements = LAYERS.flatMap((layer) => {
    const layerElements = graph.elements.filter((element) => layer.types.includes(element.type));
    return arrangeLayer(layerElements, layer.y);
  });

  const positionedIds = new Set(positionedElements.map((element) => element.id));
  const untouchedElements = graph.elements.filter((element) => !positionedIds.has(element.id));

  return {
    ...graph,
    elements: [...positionedElements, ...untouchedElements],
  };
}

export function analyzeArchitecture(graph: BoardGraph): ArchitectureSuggestion[] {
  const suggestions: ArchitectureSuggestion[] = [];
  const hasClient = hasType(graph, "client");
  const hasGateway = hasType(graph, "api-gateway") || hasType(graph, "load-balancer");
  const hasService = hasType(graph, "service");
  const hasDatabase = hasType(graph, "database");
  const hasCache = hasType(graph, "cache");
  const hasQueue = hasType(graph, "queue");

  if (hasClient && hasService && !hasGateway) {
    suggestions.push({
      id: "suggest-api-gateway",
      type: "missing-component",
      severity: "high",
      title: "Add an API gateway or load balancer",
      description: "Clients are connected to services without a clear entry layer.",
      relatedElementIds: idsByTypes(graph, ["client", "service"]),
      suggestedElementType: "api-gateway",
    });
  }

  if (hasService && !hasDatabase) {
    suggestions.push({
      id: "suggest-database",
      type: "missing-component",
      severity: "medium",
      title: "Add a persistence layer",
      description: "Services are present, but the diagram does not show where durable data lives.",
      relatedElementIds: idsByTypes(graph, ["service"]),
      suggestedElementType: "database",
    });
  }

  if (hasDatabase && !hasCache && graph.elements.filter((element) => element.type === "service").length > 2) {
    suggestions.push({
      id: "suggest-cache",
      type: "performance",
      severity: "medium",
      title: "Consider adding a cache",
      description: "Multiple services may benefit from a cache to reduce database pressure.",
      relatedElementIds: idsByTypes(graph, ["service", "database"]),
      suggestedElementType: "cache",
    });
  }

  if (hasService && !hasQueue && graph.elements.some((element) => /email|notification|job|worker/i.test(element.label))) {
    suggestions.push({
      id: "suggest-queue",
      type: "reliability",
      severity: "medium",
      title: "Consider async processing with a queue",
      description: "Background or notification-style work is usually more reliable behind a queue.",
      relatedElementIds: idsByTypes(graph, ["service"]),
      suggestedElementType: "queue",
    });
  }

  return suggestions;
}

function arrangeLayer(elements: BoardElement[], y: number): BoardElement[] {
  const gap = 80;
  const totalWidth = elements.reduce((sum, element) => sum + element.size.width, 0);
  const totalGap = Math.max(0, elements.length - 1) * gap;
  let cursorX = Math.max(80, 600 - (totalWidth + totalGap) / 2);

  return elements.map((element) => {
    const nextElement = {
      ...element,
      position: {
        x: cursorX,
        y,
      },
    };

    cursorX += element.size.width + gap;
    return nextElement;
  });
}

function hasType(graph: BoardGraph, type: BoardElementType): boolean {
  return graph.elements.some((element) => element.type === type);
}

function idsByTypes(graph: BoardGraph, types: BoardElementType[]): string[] {
  return graph.elements
    .filter((element) => types.includes(element.type))
    .map((element) => element.id);
}
