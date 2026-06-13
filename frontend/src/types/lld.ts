export type UmlVisibility = "+" | "-" | "#" | "~";

export type UmlMember = {
  id: string;
  signature: string;
  visibility: UmlVisibility;
};

export type UmlClassKind = "class" | "abstract" | "interface" | "enum";

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
};

export type UmlRelationshipKind =
  | "association"
  | "dependency"
  | "inheritance"
  | "implementation"
  | "aggregation"
  | "composition";

export type UmlHandleId = "top" | "right" | "bottom" | "left";

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

export type LLDDraft = {
  classes: UmlClass[];
  relationships: UmlRelationship[];
};

export type LLDBoard = LLDDraft & {
  id: string;
  name: string;
  ownerId: string;
  collaboratorIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type RecentLLDBoard = {
  id: string;
  name: string;
  ownerId: string;
  updatedAt: string;
};

export type LLDTemplate = {
  id: string;
  name: string;
  description: string;
  draft: LLDDraft;
};
