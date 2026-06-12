import type {
  BoardElement,
  BoardElementType,
  BoardGraph,
} from "../types/board";

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
