import type {
  HLDAnalysisResult,
  LLDAnalysisResult,
} from "../../types/ai.js";
import type { BoardGraph } from "../../types/board.js";
import type { LLDGraph } from "../../types/lld.js";
import { fallbackHLDAnalysis, fallbackLLDAnalysis } from "./ai.fallback.js";
import {
  requestGroqHLDAnalysis,
  requestGroqLLDAnalysis,
} from "./groq.provider.js";
import { sanitizeHLDAnalysis, sanitizeLLDAnalysis } from "./ai.validation.js";

export async function analyzeHLDWithAI(
  graph: BoardGraph,
): Promise<HLDAnalysisResult> {
  try {
    const rawAnalysis = await requestGroqHLDAnalysis(graph);
    return {
      source: "ai",
      suggestions: sanitizeHLDAnalysis(rawAnalysis, graph),
    };
  } catch (error) {
    logFallback("HLD", error);
    return {
      source: "rules",
      suggestions: fallbackHLDAnalysis(graph),
    };
  }
}

export async function analyzeLLDWithAI(
  graph: LLDGraph,
): Promise<LLDAnalysisResult> {
  try {
    const rawAnalysis = await requestGroqLLDAnalysis(graph);
    const suggestions = sanitizeLLDAnalysis(rawAnalysis, graph);

    if (suggestions.length === 0) {
      throw new Error("Groq returned no usable LLD suggestions.");
    }

    return {
      source: "ai",
      suggestions,
    };
  } catch (error) {
    logFallback("LLD", error);
    return {
      source: "rules",
      suggestions: fallbackLLDAnalysis(graph),
    };
  }
}

function logFallback(mode: string, error: unknown): void {
  const message = error instanceof Error ? error.message : "Unknown AI provider error";
  console.warn(`${mode} AI analysis unavailable; using rule fallback: ${message}`);
}
