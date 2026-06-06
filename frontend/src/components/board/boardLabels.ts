import type { BoardElementType } from "../../types/board";

export function labelForType(type: BoardElementType): string {
  const labels: Record<BoardElementType, string> = {
    "api-gateway": "API Gateway",
    cache: "Cache",
    client: "Client",
    database: "Database",
    "external-api": "External API",
    "load-balancer": "Load Balancer",
    queue: "Queue",
    service: "Service",
    text: "Text",
  };

  return labels[type];
}
