import type {
  LldGraph,
  UmlClassKind,
  UmlHandleId,
  UmlRelationshipKind,
  UmlVisibility,
} from "../../types/lld.js";

const classKinds: UmlClassKind[] = ["class", "abstract", "interface", "enum"];
const relationshipKinds: UmlRelationshipKind[] = [
  "association",
  "dependency",
  "inheritance",
  "implementation",
  "aggregation",
  "composition",
];
const handleIds: UmlHandleId[] = ["top", "right", "bottom", "left"];
const visibilities: UmlVisibility[] = ["+", "-", "#", "~"];

export function validateLldGraph(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return ["LLD graph must be an object"];
  }

  const graph = value as Partial<LldGraph>;

  if (!Array.isArray(graph.classes) || !Array.isArray(graph.relationships)) {
    return ["LLD graph must contain classes and relationships arrays"];
  }

  const errors: string[] = [];
  const classIds = new Set<string>();
  const relationshipIds = new Set<string>();

  for (const umlClass of graph.classes) {
    if (!umlClass || typeof umlClass !== "object" || typeof umlClass.id !== "string") {
      errors.push("Every UML class must have a string id");
      continue;
    }

    if (classIds.has(umlClass.id)) {
      errors.push(`Duplicate UML class id ${umlClass.id}`);
    }
    classIds.add(umlClass.id);

    if (!classKinds.includes(umlClass.kind)) {
      errors.push(`UML class ${umlClass.id} has an invalid kind`);
    }

    if (
      typeof umlClass.name !== "string" ||
      typeof umlClass.responsibility !== "string" ||
      !isPosition(umlClass.position)
    ) {
      errors.push(`UML class ${umlClass.id} has invalid details`);
    }

    if (
      !Array.isArray(umlClass.attributes) ||
      !umlClass.attributes.every(isMember) ||
      !Array.isArray(umlClass.methods) ||
      !umlClass.methods.every(isMember)
    ) {
      errors.push(`UML class ${umlClass.id} has invalid members`);
    }
  }

  for (const relationship of graph.relationships) {
    if (
      !relationship ||
      typeof relationship !== "object" ||
      typeof relationship.id !== "string"
    ) {
      errors.push("Every UML relationship must have a string id");
      continue;
    }

    if (relationshipIds.has(relationship.id)) {
      errors.push(`Duplicate UML relationship id ${relationship.id}`);
    }
    relationshipIds.add(relationship.id);

    if (!classIds.has(relationship.sourceClassId)) {
      errors.push(
        `Relationship ${relationship.id} has missing source ${relationship.sourceClassId}`,
      );
    }

    if (!classIds.has(relationship.targetClassId)) {
      errors.push(
        `Relationship ${relationship.id} has missing target ${relationship.targetClassId}`,
      );
    }

    if (!relationshipKinds.includes(relationship.kind)) {
      errors.push(`Relationship ${relationship.id} has an invalid kind`);
    }

    if (
      (relationship.sourceHandleId !== undefined &&
        !handleIds.includes(relationship.sourceHandleId)) ||
      (relationship.targetHandleId !== undefined &&
        !handleIds.includes(relationship.targetHandleId))
    ) {
      errors.push(`Relationship ${relationship.id} has an invalid handle`);
    }

    if (
      typeof relationship.label !== "string" ||
      typeof relationship.sourceMultiplicity !== "string" ||
      typeof relationship.targetMultiplicity !== "string"
    ) {
      errors.push(`Relationship ${relationship.id} has invalid details`);
    }
  }

  return errors;
}

function isPosition(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const position = value as { x?: unknown; y?: unknown };
  return typeof position.x === "number" && typeof position.y === "number";
}

function isMember(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const member = value as { id?: unknown; signature?: unknown; visibility?: unknown };

  return (
    typeof member.id === "string" &&
    typeof member.signature === "string" &&
    typeof member.visibility === "string" &&
    visibilities.includes(member.visibility as UmlVisibility)
  );
}
