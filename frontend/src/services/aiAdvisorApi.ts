import type {
  HLDAnalysisResult,
  LLDAnalysisResult,
} from "../types/ai";
import type { BoardGraph } from "../types/board";
import type { LLDDraft } from "../types/lld";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function analyzeHLDGraph(graph: BoardGraph): Promise<HLDAnalysisResult> {
  return requestAnalysis("/api/ai/analyze/hld", graph);
}

export async function analyzeLLDGraph(graph: LLDDraft): Promise<LLDAnalysisResult> {
  return requestAnalysis("/api/ai/analyze/lld", graph);
}

async function requestAnalysis<T>(path: string, graph: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(graph),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      typeof errorBody?.message === "string"
        ? errorBody.message
        : Array.isArray(errorBody?.errors) && typeof errorBody.errors[0] === "string"
          ? errorBody.errors[0]
          : "AI analysis failed";

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
