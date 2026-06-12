import type { Node, NodeChange } from "@xyflow/react";
import { useCallback, useState } from "react";

type NodeMeasurement = NonNullable<Node["measured"]>;

export function useNodeMeasurements() {
  const [measurements, setMeasurements] = useState<Record<string, NodeMeasurement>>({});

  const captureMeasurements = useCallback((changes: NodeChange[]) => {
    const dimensionChanges = changes.filter(
      (change) => change.type === "dimensions" && change.dimensions,
    );

    if (dimensionChanges.length === 0) {
      return;
    }

    setMeasurements((currentMeasurements) => {
      const nextMeasurements = { ...currentMeasurements };
      let changed = false;

      for (const change of dimensionChanges) {
        if (change.type !== "dimensions" || !change.dimensions) {
          continue;
        }

        const currentMeasurement = currentMeasurements[change.id];

        if (
          currentMeasurement?.width === change.dimensions.width &&
          currentMeasurement.height === change.dimensions.height
        ) {
          continue;
        }

        nextMeasurements[change.id] = change.dimensions;
        changed = true;
      }

      return changed ? nextMeasurements : currentMeasurements;
    });
  }, []);
  const measurementFor = useCallback(
    (nodeId: string) => measurements[nodeId],
    [measurements],
  );

  return {
    captureMeasurements,
    measurementFor,
  };
}

export function isGraphNodeChange(
  change: NodeChange,
): change is Extract<NodeChange, { type: "position" | "remove" }> {
  return change.type === "position" || change.type === "remove";
}
