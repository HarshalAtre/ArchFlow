import type { UmlClass, UmlRelationship } from "../types/lld";

export type LldSuggestionSeverity = "info" | "warning" | "critical";

export type LldSuggestion = {
  id: string;
  title: string;
  description: string;
  severity: LldSuggestionSeverity;
};

export function analyzeLldDesign(
  classes: UmlClass[],
  relationships: UmlRelationship[],
): LldSuggestion[] {
  const suggestions: LldSuggestion[] = [];
  const classById = new Map(classes.map((umlClass) => [umlClass.id, umlClass]));

  if (classes.length < 3) {
    suggestions.push({
      id: "missing-core-types",
      severity: "info",
      title: "Add enough collaborating types",
      description:
        "A good LLD interview diagram usually has entities, services, contracts, and value objects. Add a few more types if the design feels too thin.",
    });
  }

  for (const umlClass of classes) {
    if (!umlClass.responsibility.trim()) {
      suggestions.push({
        id: `missing-responsibility-${umlClass.id}`,
        severity: "warning",
        title: `${umlClass.name} needs a responsibility`,
        description:
          "Write what this type owns and why it should change. That helps you explain SRP during the interview.",
      });
    }

    if (umlClass.kind === "interface" && umlClass.methods.length === 0) {
      suggestions.push({
        id: `empty-interface-${umlClass.id}`,
        severity: "warning",
        title: `${umlClass.name} is an empty interface`,
        description:
          "Interfaces should express a useful contract. Add operations or remove the interface until the abstraction earns its place.",
      });
    }

    if (umlClass.attributes.length > 6 || umlClass.methods.length > 7) {
      suggestions.push({
        id: `large-type-${umlClass.id}`,
        severity: "warning",
        title: `${umlClass.name} may be doing too much`,
        description:
          "Many fields or operations can signal weak cohesion. Consider splitting responsibilities into a collaborator or value object.",
      });
    }
  }

  for (const umlClass of classes.filter((currentClass) => currentClass.kind !== "enum")) {
    const isConnected = relationships.some(
      (relationship) =>
        relationship.sourceClassId === umlClass.id || relationship.targetClassId === umlClass.id,
    );

    if (!isConnected) {
      suggestions.push({
        id: `isolated-type-${umlClass.id}`,
        severity: "info",
        title: `${umlClass.name} is isolated`,
        description:
          "Show how this type collaborates with the rest of the design, or remove it if it is not part of the flow.",
      });
    }
  }

  for (const relationship of relationships) {
    const sourceClass = classById.get(relationship.sourceClassId);
    const targetClass = classById.get(relationship.targetClassId);

    if (!sourceClass || !targetClass) {
      continue;
    }

    if (relationship.kind === "implementation" && targetClass.kind !== "interface") {
      suggestions.push({
        id: `implementation-target-${sourceClass.id}-${targetClass.id}`,
        severity: "critical",
        title: `${sourceClass.name} implements a non-interface`,
        description:
          "Use implementation only when a concrete class satisfies an interface contract. Use inheritance or association otherwise.",
      });
    }

    if (relationship.kind === "inheritance" && targetClass.kind === "interface") {
      suggestions.push({
        id: `inheritance-interface-${sourceClass.id}-${targetClass.id}`,
        severity: "warning",
        title: `${sourceClass.name} should implement ${targetClass.name}`,
        description:
          "An interface relationship is better shown as implementation, while inheritance should point to a base class.",
      });
    }

    if (relationship.kind === "dependency" && targetClass.kind === "class") {
      suggestions.push({
        id: `concrete-dependency-${sourceClass.id}-${targetClass.id}`,
        severity: "info",
        title: `${sourceClass.name} depends on concrete ${targetClass.name}`,
        description:
          "For extensible designs, depend on an interface when the target has multiple implementations or external variability.",
      });
    }
  }

  if (
    classes.some((umlClass) =>
      umlClass.attributes.some((attribute) => /status|state/i.test(attribute.signature)),
    ) &&
    !classes.some((umlClass) => umlClass.kind === "enum")
  ) {
    suggestions.push({
      id: "missing-status-enum",
      severity: "info",
      title: "Model status/state as an enum",
      description:
        "A status field is easier to discuss when its valid states are explicit. Add an enum like OrderStatus or PaymentState.",
    });
  }

  if (!relationships.some((relationship) => relationship.kind === "implementation")) {
    suggestions.push({
      id: "no-interface-implementation",
      severity: "info",
      title: "Show at least one contract boundary",
      description:
        "Implementation edges are useful for explaining DIP, testing seams, and provider integrations in LLD interviews.",
    });
  }

  return suggestions.slice(0, 8);
}
