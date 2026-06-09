import { describe, expect, it } from "vitest";

import { analyzeArchitecture, cleanupArchitectureLayout } from "./architectureEngine";
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

describe("analyzeArchitecture", () => {
  it("suggests an API gateway and database for a client-service diagram", () => {
    const suggestions = analyzeArchitecture({
      elements: [
        element("web-client", "client", "Web Client", 0, 0),
        element("orders-api", "service", "Order Service", 0, 0),
      ],
      edges: [],
    });

    expect(suggestions.map((suggestion) => suggestion.id)).toEqual([
      "suggest-api-gateway",
      "suggest-database",
    ]);
    expect(suggestions[0]?.severity).toBe("high");
  });

  it("suggests a cache when several services share a database", () => {
    const suggestions = analyzeArchitecture({
      elements: [
        element("gateway", "api-gateway", "API Gateway", 0, 0),
        element("orders-api", "service", "Order Service", 0, 0),
        element("billing-api", "service", "Billing Service", 0, 0),
        element("shipping-api", "service", "Shipping Service", 0, 0),
        element("orders-db", "database", "Orders DB", 0, 0),
      ],
      edges: [],
    });

    expect(suggestions).toContainEqual(
      expect.objectContaining({
        id: "suggest-cache",
        suggestedElementType: "cache",
        type: "performance",
      }),
    );
  });

  it("suggests a queue for notification or worker workloads", () => {
    const suggestions = analyzeArchitecture({
      elements: [
        element("gateway", "api-gateway", "API Gateway", 0, 0),
        element("notification-worker", "service", "Notification Worker", 0, 0),
        element("notifications-db", "database", "Notifications DB", 0, 0),
      ],
      edges: [],
    });

    expect(suggestions).toContainEqual(
      expect.objectContaining({
        id: "suggest-queue",
        suggestedElementType: "queue",
        type: "reliability",
      }),
    );
  });

  it("does not suggest missing gateway, database, cache, or queue for a complete diagram", () => {
    const suggestions = analyzeArchitecture({
      elements: [
        element("web-client", "client", "Web Client", 0, 0),
        element("gateway", "api-gateway", "API Gateway", 0, 0),
        element("orders-api", "service", "Order Service", 0, 0),
        element("orders-db", "database", "Orders DB", 0, 0),
        element("session-cache", "cache", "Session Cache", 0, 0),
        element("order-events", "queue", "Order Events", 0, 0),
      ],
      edges: [],
    });

    expect(suggestions).toEqual([]);
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
