import { describe, expect, it } from "vitest";

import type { LLDGraph } from "../../types/lld.js";
import { fallbackLLDAnalysis } from "./ai.fallback.js";

describe("fallbackLLDAnalysis", () => {
  it("returns useful feedback for a healthy connected diagram", () => {
    const graph: LLDGraph = {
      classes: [
        umlClass("order-service", "class", "OrderService"),
        umlClass("order", "class", "Order"),
        umlClass("payment-gateway", "interface", "PaymentGateway"),
      ],
      relationships: [
        {
          id: "service-order",
          sourceClassId: "order-service",
          targetClassId: "order",
          kind: "association",
          label: "manages",
          sourceMultiplicity: "1",
          targetMultiplicity: "*",
        },
        {
          id: "service-payment",
          sourceClassId: "order-service",
          targetClassId: "payment-gateway",
          kind: "dependency",
          label: "uses",
          sourceMultiplicity: "",
          targetMultiplicity: "",
        },
      ],
    };

    expect(fallbackLLDAnalysis(graph)).toEqual([
      expect.objectContaining({
        id: "healthy-design-baseline",
        severity: "info",
      }),
    ]);
  });
});

function umlClass(
  id: string,
  kind: "class" | "interface",
  name: string,
): LLDGraph["classes"][number] {
  return {
    id,
    kind,
    name,
    position: { x: 0, y: 0 },
    attributes: [],
    methods:
      kind === "interface"
        ? [
            {
              id: `${id}-method`,
              signature: "execute(): void",
              visibility: "+",
            },
          ]
        : [],
    responsibility: `${name} has one clear responsibility.`,
  };
}
