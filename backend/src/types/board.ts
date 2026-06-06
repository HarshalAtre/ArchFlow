export type BoardElementType =
  | "client"
  | "service"
  | "database"
  | "queue"
  | "cache"
  | "external-api"
  | "load-balancer"
  | "api-gateway"
  | "text";

export type Position = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type BoardElement = {
  id: string;
  type: BoardElementType;
  position: Position;
  size: Size;
  label: string;
  metadata?: Record<string, unknown>;
};

export type BoardEdge = {
  id: string;
  sourceElementId: string;
  targetElementId: string;
  label?: string;
  metadata?: Record<string, unknown>;
};

export type Board = {
  id: string;
  name: string;
  ownerId: string;
  elements: BoardElement[];
  edges: BoardEdge[];
  createdAt: string;
  updatedAt: string;
};

export type BoardGraph = {
  elements: BoardElement[];
  edges: BoardEdge[];
};

export type ArchitectureSuggestion = {
  id: string;
  type: "missing-component" | "scalability" | "performance" | "reliability" | "security";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  relatedElementIds: string[];
  suggestedElementType?: BoardElementType;
};
