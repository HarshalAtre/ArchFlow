export type UmlVisibility = "+" | "-" | "#" | "~";

export type UmlClassKind = "class" | "abstract" | "interface" | "enum";

export type UmlRelationshipKind =
  | "association"
  | "dependency"
  | "inheritance"
  | "implementation"
  | "aggregation"
  | "composition";

export type UmlHandleId = "top" | "right" | "bottom" | "left";

export type UmlMember = {
  id: string;
  signature: string;
  visibility: UmlVisibility;
};

export type UmlClass = {
  id: string;
  kind: UmlClassKind;
  name: string;
  position: {
    x: number;
    y: number;
  };
  attributes: UmlMember[];
  methods: UmlMember[];
  responsibility: string;
  contextItems?: ContextItem[];
};

export type UmlRelationship = {
  id: string;
  sourceClassId: string;
  targetClassId: string;
  sourceHandleId?: UmlHandleId;
  targetHandleId?: UmlHandleId;
  kind: UmlRelationshipKind;
  label: string;
  sourceMultiplicity: string;
  targetMultiplicity: string;
};

export type LLDGraph = {
  classes: UmlClass[];
  relationships: UmlRelationship[];
};

export type LLDBoard = LLDGraph & {
  id: string;
  name: string;
  ownerId: string;
  collaboratorIds: string[];
  viewerIds: string[];
  shareToken?: string;
  shareRole?: Exclude<BoardAccessRole, "owner">;
  accessRole?: BoardAccessRole;
  createdAt: string;
  updatedAt: string;
};

export type LLDBoardSummary = {
  id: string;
  name: string;
  ownerId: string;
  updatedAt: string;
  accessRole?: BoardAccessRole;
};
import type { BoardAccessRole, ContextItem } from "./board.js";
