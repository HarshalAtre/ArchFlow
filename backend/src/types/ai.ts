import type { BoardElementType } from "./board.js";
import type { UmlClassKind, UmlRelationshipKind } from "./lld.js";

export type AnalysisSource = "ai" | "rules";

export type HLDAddElementAction = {
  kind: "add-element";
  elementType: BoardElementType;
  label: string;
  connectFromElementIds: string[];
  connectToElementIds: string[];
};

export type HLDAnalysisSuggestion = {
  id: string;
  type: "missing-component" | "scalability" | "performance" | "reliability" | "security";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  relatedElementIds: string[];
  action?: HLDAddElementAction;
};

export type LLDAddTypeAction = {
  kind: "add-type";
  classKind: UmlClassKind;
  name: string;
  responsibility: string;
  attributes: string[];
  methods: string[];
  anchorClassId: string;
  relationshipDirection: "existing-to-new" | "new-to-existing";
  relationshipKind: UmlRelationshipKind;
  relationshipLabel: string;
};

export type LLDAddRelationshipAction = {
  kind: "add-relationship";
  sourceClassId: string;
  targetClassId: string;
  relationshipKind: UmlRelationshipKind;
  label: string;
};

export type LLDAnalysisSuggestion = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  relatedClassIds: string[];
  action?: LLDAddTypeAction | LLDAddRelationshipAction;
};

export type HLDAnalysisResult = {
  source: AnalysisSource;
  suggestions: HLDAnalysisSuggestion[];
};

export type LLDAnalysisResult = {
  source: AnalysisSource;
  suggestions: LLDAnalysisSuggestion[];
};
