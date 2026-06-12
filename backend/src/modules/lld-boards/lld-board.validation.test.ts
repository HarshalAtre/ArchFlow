import { describe, expect, it } from "vitest";

import type { LldGraph } from "../../types/lld.js";

import { validateLldGraph } from "./lld-board.validation.js";

describe("validateLldGraph", () => {
  it("accepts valid UML classes and four-side relationship handles", () => {
    const graph = exampleGraph();

    graph.relationships.push({
      id: "relationship-service-repository",
      sourceClassId: "order-service",
      targetClassId: "order-repository",
      sourceHandleId: "bottom",
      targetHandleId: "top",
      kind: "dependency",
      label: "uses",
      sourceMultiplicity: "1",
      targetMultiplicity: "1",
    });

    expect(validateLldGraph(graph)).toEqual([]);
  });

  it("rejects relationships that reference missing classes", () => {
    const graph = exampleGraph();

    graph.relationships.push({
      id: "relationship-missing",
      sourceClassId: "missing-source",
      targetClassId: "missing-target",
      kind: "association",
      label: "",
      sourceMultiplicity: "",
      targetMultiplicity: "",
    });

    expect(validateLldGraph(graph)).toEqual([
      "Relationship relationship-missing has missing source missing-source",
      "Relationship relationship-missing has missing target missing-target",
    ]);
  });
});

function exampleGraph(): LldGraph {
  return {
    classes: [
      {
        id: "order-service",
        kind: "class",
        name: "OrderService",
        position: { x: 100, y: 100 },
        attributes: [],
        methods: [
          {
            id: "create-order",
            signature: "createOrder(): Order",
            visibility: "+",
          },
        ],
        responsibility: "Coordinates order creation.",
      },
      {
        id: "order-repository",
        kind: "interface",
        name: "OrderRepository",
        position: { x: 100, y: 400 },
        attributes: [],
        methods: [
          {
            id: "save-order",
            signature: "save(order: Order): void",
            visibility: "+",
          },
        ],
        responsibility: "Persists orders.",
      },
    ],
    relationships: [],
  };
}
