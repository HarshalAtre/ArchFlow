import { describe, expect, it } from "vitest";

import { cleanupArchitectureLayout } from "./architectureEngine";
import type { BoardElement, BoardElementType, BoardGraph } from "../types/board";

describe("cleanupArchitectureLayout", () => {
  it("places architecture elements into predictable layers without changing edges", () => {
    const graph: BoardGraph = {
      elements: [
        element("orders-db", "database", "Orders DB", 90, 20),
        element("web-client", "client", "Web Client", 800, 600),
        element("orders-api", "service", "Order Service", 200, 120),
        element("gateway", "api-gateway", "API Gateway", 300, 500),
      ],
      edges: [
        {
          id: "edge-client-gateway",
          sourceElementId: "web-client",
          targetElementId: "gateway",
        },
      ],
    };

    const cleanedGraph = cleanupArchitectureLayout(graph);

    expect(positionFor(cleanedGraph, "web-client").y).toBe(80);
    expect(positionFor(cleanedGraph, "gateway").y).toBe(220);
    expect(positionFor(cleanedGraph, "orders-api").y).toBe(360);
    expect(positionFor(cleanedGraph, "orders-db").y).toBe(520);
    expect(cleanedGraph.edges).toEqual(graph.edges);
  });

  it("keeps nodes in the same layer spaced apart", () => {
    const graph: BoardGraph = {
      elements: [
        element("orders-api", "service", "Order Service", 0, 0),
        element("billing-api", "service", "Billing Service", 0, 0),
        element("shipping-api", "service", "Shipping Service", 0, 0),
      ],
      edges: [],
    };

    const cleanedGraph = cleanupArchitectureLayout(graph);
    const xPositions = cleanedGraph.elements.map((currentElement) => currentElement.position.x);

    expect(xPositions[1] - xPositions[0]).toBe(260);
    expect(xPositions[2] - xPositions[1]).toBe(260);
  });
});

function element(
  id: string,
  type: BoardElementType,
  label: string,
  x: number,
  y: number,
): BoardElement {
  return {
    id,
    label,
    type,
    position: { x, y },
    size: { width: 180, height: 64 },
  };
}

function positionFor(graph: BoardGraph, elementId: string) {
  const foundElement = graph.elements.find((currentElement) => currentElement.id === elementId);

  if (!foundElement) {
    throw new Error(`Missing test element ${elementId}`);
  }

  return foundElement.position;
}
