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

export type BoardElementMetadata = {
  apiEndpoint?: string;
  links?: string;
  notes?: string;
  owner?: string;
  [key: string]: unknown;
};

export type RecentBoard = {
  id: string;
  name: string;
  ownerId: string;
  updatedAt: string;
};

export type BoardElement = {
  id: string;
  type: BoardElementType;
  position: Position;
  size: Size;
  label: string;
  metadata?: BoardElementMetadata;
};

export type BoardEdge = {
  id: string;
  sourceElementId: string;
  targetElementId: string;
  label?: string;
  metadata?: Record<string, unknown>;
};

export type BoardGraph = {
  elements: BoardElement[];
  edges: BoardEdge[];
};

export type Board = BoardGraph & {
  id: string;
  name: string;
  ownerId: string;
  collaboratorIds: string[];
  createdAt: string;
  updatedAt: string;
};
