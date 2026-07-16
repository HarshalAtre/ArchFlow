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
  contextItems?: ContextItem[];
  links?: string;
  notes?: string;
  owner?: string;
  [key: string]: unknown;
};

export type ContextItem = {
  id: string;
  type: "link" | "snippet" | "file";
  title: string;
  url?: string;
  content?: string;
  language?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  dataUrl?: string;
};

export type BoardAccessRole = "owner" | "editor" | "viewer";

export type RecentBoard = {
  id: string;
  name: string;
  ownerId: string;
  updatedAt: string;
  accessRole?: BoardAccessRole;
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
  viewerIds: string[];
  accessRole?: BoardAccessRole;
  createdAt: string;
  updatedAt: string;
};
