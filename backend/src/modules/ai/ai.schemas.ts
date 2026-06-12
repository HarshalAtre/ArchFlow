export const hldAnalysisSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "missing-component",
              "scalability",
              "performance",
              "reliability",
              "security",
            ],
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          title: { type: "string" },
          description: { type: "string" },
          relatedElementIds: {
            type: "array",
            items: { type: "string" },
          },
          actionKind: {
            type: "string",
            enum: ["none", "add-element"],
          },
          elementType: {
            type: "string",
            enum: [
              "none",
              "client",
              "service",
              "database",
              "queue",
              "cache",
              "external-api",
              "load-balancer",
              "api-gateway",
              "text",
            ],
          },
          elementLabel: { type: "string" },
          connectFromElementIds: {
            type: "array",
            items: { type: "string" },
          },
          connectToElementIds: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "type",
          "severity",
          "title",
          "description",
          "relatedElementIds",
          "actionKind",
          "elementType",
          "elementLabel",
          "connectFromElementIds",
          "connectToElementIds",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
} as const;

export const lldAnalysisSchema = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            enum: ["info", "warning", "critical"],
          },
          title: { type: "string" },
          description: { type: "string" },
          relatedClassIds: {
            type: "array",
            items: { type: "string" },
          },
          actionKind: {
            type: "string",
            enum: ["none", "add-type", "add-relationship"],
          },
          classKind: {
            type: "string",
            enum: ["none", "class", "abstract", "interface", "enum"],
          },
          typeName: { type: "string" },
          responsibility: { type: "string" },
          attributes: {
            type: "array",
            items: { type: "string" },
          },
          methods: {
            type: "array",
            items: { type: "string" },
          },
          anchorClassId: { type: "string" },
          relationshipDirection: {
            type: "string",
            enum: ["none", "existing-to-new", "new-to-existing"],
          },
          sourceClassId: { type: "string" },
          targetClassId: { type: "string" },
          relationshipKind: {
            type: "string",
            enum: [
              "none",
              "association",
              "dependency",
              "inheritance",
              "implementation",
              "aggregation",
              "composition",
            ],
          },
          relationshipLabel: { type: "string" },
        },
        required: [
          "severity",
          "title",
          "description",
          "relatedClassIds",
          "actionKind",
          "classKind",
          "typeName",
          "responsibility",
          "attributes",
          "methods",
          "anchorClassId",
          "relationshipDirection",
          "sourceClassId",
          "targetClassId",
          "relationshipKind",
          "relationshipLabel",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
} as const;
