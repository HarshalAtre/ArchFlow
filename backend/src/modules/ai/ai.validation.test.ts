import { describe, expect, it } from "vitest";

import type { BoardGraph } from "../../types/board.js";
import type { LLDGraph } from "../../types/lld.js";
import { sanitizeHLDAnalysis, sanitizeLLDAnalysis } from "./ai.validation.js";

describe("sanitizeHLDAnalysis", () => {
  it("keeps only existing connection IDs in additive actions", () => {
    const graph: BoardGraph = {
      elements: [
        {
          id: "client",
          type: "client",
          label: "Web",
          position: { x: 0, y: 0 },
          size: { width: 180, height: 64 },
        },
        {
          id: "service",
          type: "service",
          label: "Orders",
          position: { x: 200, y: 0 },
          size: { width: 180, height: 64 },
        },
      ],
      edges: [],
    };

    const suggestions = sanitizeHLDAnalysis(
      {
        suggestions: [
          {
            type: "missing-component",
            severity: "high",
            title: "Add a gateway",
            description: "Create a controlled entry point.",
            relatedElementIds: ["client", "missing"],
            actionKind: "add-element",
            elementType: "api-gateway",
            elementLabel: "Public API Gateway",
            connectFromElementIds: ["client", "missing"],
            connectToElementIds: ["service", "missing"],
          },
        ],
      },
      graph,
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        relatedElementIds: ["client"],
        action: expect.objectContaining({
          connectFromElementIds: ["client"],
          connectToElementIds: ["service"],
        }),
      }),
    );
  });
});

describe("sanitizeLLDAnalysis", () => {
  it("normalizes common AI severity labels", () => {
    const graph: LLDGraph = {
      classes: [umlClass("order-service", "class", "OrderService")],
      relationships: [],
    };

    const suggestions = sanitizeLLDAnalysis(
      {
        suggestions: [
          {
            severity: "medium",
            title: "Separate payment coordination",
            description: "Keep the order service focused on order workflows.",
            relatedClassIds: ["order-service"],
            actionKind: "none",
          },
        ],
      },
      graph,
    );

    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        severity: "warning",
        title: "Separate payment coordination",
      }),
    );
  });

  it("repairs a valid add-type action with missing relationship metadata", () => {
    const graph: LLDGraph = {
      classes: [umlClass("payment-gateway", "interface", "PaymentGateway")],
      relationships: [],
    };

    const suggestions = sanitizeLLDAnalysis(
      {
        suggestions: [
          {
            severity: "low",
            title: "Add a payment result",
            description: "Represent the gateway result explicitly.",
            relatedClassIds: ["payment-gateway"],
            actionKind: "add-type",
            classKind: "class",
            typeName: "PaymentResult",
            responsibility: "Contains the payment outcome.",
            attributes: ["- success: boolean"],
            methods: ["+ isSuccessful(): boolean"],
            anchorClassId: "payment-gateway",
            relationshipDirection: "none",
            relationshipKind: "none",
            relationshipLabel: "",
          },
        ],
      },
      graph,
    );

    expect(suggestions[0]?.action).toEqual({
      kind: "add-type",
      classKind: "class",
      name: "PaymentResult",
      responsibility: "Contains the payment outcome.",
      attributes: ["success: boolean"],
      methods: ["isSuccessful(): boolean"],
      anchorClassId: "payment-gateway",
      relationshipDirection: "existing-to-new",
      relationshipKind: "association",
      relationshipLabel: "uses",
    });
  });

  it("keeps a safe relationship intent when adding a UML type", () => {
    const graph: LLDGraph = {
      classes: [
        umlClass("order-service", "class", "OrderService"),
        umlClass("payment-gateway", "interface", "PaymentGateway"),
      ],
      relationships: [],
    };

    const suggestions = sanitizeLLDAnalysis(
      {
        suggestions: [
          {
            severity: "info",
            title: "Add a Stripe adapter",
            description: "Represent the provider implementation explicitly.",
            relatedClassIds: ["payment-gateway"],
            actionKind: "add-type",
            classKind: "class",
            typeName: "StripePaymentGateway",
            responsibility: "Adapts Stripe to the payment contract.",
            attributes: [],
            methods: ["charge(amount: Money): PaymentResult"],
            anchorClassId: "payment-gateway",
            relationshipDirection: "new-to-existing",
            sourceClassId: "",
            targetClassId: "",
            relationshipKind: "implementation",
            relationshipLabel: "implements",
          },
        ],
      },
      graph,
    );

    expect(suggestions[0]?.action).toEqual(
      expect.objectContaining({
        kind: "add-type",
        anchorClassId: "payment-gateway",
        relationshipDirection: "new-to-existing",
        relationshipKind: "implementation",
      }),
    );
  });

  it("normalizes non-hierarchy relationships from the existing anchor to the new type", () => {
    const graph: LLDGraph = {
      classes: [umlClass("order-service", "class", "OrderService")],
      relationships: [],
    };

    const suggestions = sanitizeLLDAnalysis(
      {
        suggestions: [
          {
            severity: "info",
            title: "Add the Order entity",
            description: "Represent the aggregate explicitly.",
            relatedClassIds: ["order-service"],
            actionKind: "add-type",
            classKind: "class",
            typeName: "Order",
            responsibility: "Owns order state.",
            attributes: ["id: OrderId"],
            methods: [],
            anchorClassId: "order-service",
            relationshipDirection: "new-to-existing",
            sourceClassId: "",
            targetClassId: "",
            relationshipKind: "aggregation",
            relationshipLabel: "creates",
          },
        ],
      },
      graph,
    );

    expect(suggestions[0]?.action).toEqual(
      expect.objectContaining({
        relationshipDirection: "existing-to-new",
        relationshipKind: "aggregation",
      }),
    );
  });

  it("rejects relationship actions that reference missing UML types", () => {
    const graph: LLDGraph = {
      classes: [
        {
          id: "order-service",
          kind: "class",
          name: "OrderService",
          position: { x: 0, y: 0 },
          attributes: [],
          methods: [],
          responsibility: "Coordinates orders.",
        },
      ],
      relationships: [],
    };

    const suggestions = sanitizeLLDAnalysis(
      {
        suggestions: [
          {
            severity: "warning",
            title: "Add a repository contract",
            description: "Depend on an abstraction.",
            relatedClassIds: ["order-service"],
            actionKind: "add-relationship",
            classKind: "none",
            typeName: "",
            responsibility: "",
            attributes: [],
            methods: [],
            sourceClassId: "order-service",
            targetClassId: "missing-repository",
            relationshipKind: "dependency",
            relationshipLabel: "uses",
          },
        ],
      },
      graph,
    );

    expect(suggestions[0]?.action).toBeUndefined();
  });

  it("rejects implementation actions that do not target an interface", () => {
    const graph: LLDGraph = {
      classes: [
        umlClass("order-service", "class", "OrderService"),
        umlClass("order-repository", "class", "OrderRepository"),
      ],
      relationships: [],
    };

    const suggestions = sanitizeLLDAnalysis(
      {
        suggestions: [
          {
            severity: "critical",
            title: "Use an implementation relation",
            description: "The service should satisfy a repository contract.",
            relatedClassIds: ["order-service", "order-repository"],
            actionKind: "add-relationship",
            classKind: "none",
            typeName: "",
            responsibility: "",
            attributes: [],
            methods: [],
            sourceClassId: "order-service",
            targetClassId: "order-repository",
            relationshipKind: "implementation",
            relationshipLabel: "implements",
          },
        ],
      },
      graph,
    );

    expect(suggestions[0]?.action).toBeUndefined();
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
    methods: [],
    responsibility: `${name} responsibility.`,
  };
}
