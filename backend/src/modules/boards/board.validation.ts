import type { BoardGraph } from "../../types/board.js";

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
