import type { BoardElement, BoardGraph, Position } from "@visual-arch-board/shared";

export function updateElementPosition(
  graph: BoardGraph,
  elementId: string,
  position: Position,
): BoardGraph {
  return {
    ...graph,
    elements: graph.elements.map((element) =>
      element.id === elementId ? { ...element, position } : element,
    ),
  };
}

export function upsertElement(graph: BoardGraph, nextElement: BoardElement): BoardGraph {
  const exists = graph.elements.some((element) => element.id === nextElement.id);

  return {
    ...graph,
    elements: exists
      ? graph.elements.map((element) => (element.id === nextElement.id ? nextElement : element))
      : [...graph.elements, nextElement],
  };
}

export function removeElement(graph: BoardGraph, elementId: string): BoardGraph {
  return {
    elements: graph.elements.filter((element) => element.id !== elementId),
    edges: graph.edges.filter(
      (edge) => edge.sourceElementId !== elementId && edge.targetElementId !== elementId,
    ),
  };
}

export function validateBoardGraph(graph: BoardGraph): string[] {
  const errors: string[] = [];
  const elementIds = new Set(graph.elements.map((element) => element.id));

  for (const edge of graph.edges) {
    if (!elementIds.has(edge.sourceElementId)) {
      errors.push(`Edge ${edge.id} has missing source ${edge.sourceElementId}`);
    }

    if (!elementIds.has(edge.targetElementId)) {
      errors.push(`Edge ${edge.id} has missing target ${edge.targetElementId}`);
    }
  }

  return errors;
}
