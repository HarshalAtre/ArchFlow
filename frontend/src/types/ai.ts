import type { BoardElementType } from "./board";
import type { UmlClassKind, UmlRelationshipKind } from "./lld";

export type AnalysisSource = "ai" | "rules";

export type HLDAnalysisSuggestion = {
  id: string;
  type: "missing-component" | "scalability" | "performance" | "reliability" | "security";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  relatedElementIds: string[];
  action?: {
    kind: "add-element";
    elementType: BoardElementType;
    label: string;
    connectFromElementIds: string[];
    connectToElementIds: string[];
  };
};

export type LLDAnalysisSuggestion = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  relatedClassIds: string[];
  action?:
    | {
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
      }
    | {
        kind: "add-relationship";
        sourceClassId: string;
        targetClassId: string;
        relationshipKind: UmlRelationshipKind;
        label: string;
      };
};

export type HLDAnalysisResult = {
  source: AnalysisSource;
  suggestions: HLDAnalysisSuggestion[];
};

export type LLDAnalysisResult = {
  source: AnalysisSource;
  suggestions: LLDAnalysisSuggestion[];
};
