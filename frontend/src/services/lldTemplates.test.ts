import { describe, expect, it } from "vitest";

import { cloneLLDDraft, lldTemplates } from "./lldTemplates";

describe("lldTemplates", () => {
  it("provides unique template ids and valid relationship references", () => {
    expect(new Set(lldTemplates.map((template) => template.id)).size).toBe(lldTemplates.length);

    for (const template of lldTemplates) {
      const classIds = template.draft.classes.map((umlClass) => umlClass.id);
      const relationshipIds = template.draft.relationships.map((relationship) => relationship.id);
      const knownClassIds = new Set(classIds);

      expect(new Set(classIds).size).toBe(classIds.length);
      expect(new Set(relationshipIds).size).toBe(relationshipIds.length);

      for (const relationship of template.draft.relationships) {
        expect(knownClassIds.has(relationship.sourceClassId)).toBe(true);
        expect(knownClassIds.has(relationship.targetClassId)).toBe(true);
      }
    }
  });

  it("clones drafts without sharing editable graph objects", () => {
    const sourceDraft = lldTemplates[0].draft;
    const clonedDraft = cloneLLDDraft(sourceDraft);

    expect(clonedDraft).toEqual(sourceDraft);
    expect(clonedDraft).not.toBe(sourceDraft);
    expect(clonedDraft.classes[0]).not.toBe(sourceDraft.classes[0]);
    expect(clonedDraft.classes[0].attributes[0]).not.toBe(sourceDraft.classes[0].attributes[0]);
    expect(clonedDraft.relationships[0]).not.toBe(sourceDraft.relationships[0]);
  });
});
