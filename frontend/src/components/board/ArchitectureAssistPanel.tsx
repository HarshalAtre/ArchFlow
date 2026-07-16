import type { AnalysisSource, HLDAnalysisSuggestion } from "../../types/ai";

type ArchitectureAssistPanelProps = {
  error: string;
  loading: boolean;
  source: AnalysisSource | null;
  suggestions: HLDAnalysisSuggestion[];
  onApplySuggestion: (suggestion: HLDAnalysisSuggestion) => void;
  readOnly?: boolean;
};

export function ArchitectureAssistPanel({
  error,
  loading,
  source,
  suggestions,
  onApplySuggestion,
  readOnly = false,
}: ArchitectureAssistPanelProps) {
  return (
    <section>
      <span className="section-label">Architecture Assist</span>
      {source ? (
        <p className="analysis-source">
          {source === "ai" ? "Groq AI analysis" : "Rule-based fallback"}
        </p>
      ) : null}
      {error ? <p className="status-text status-error">{error}</p> : null}
      {loading ? <p className="muted">Analyzing the architecture...</p> : null}
      {suggestions.length > 0 ? (
        <div className="suggestions">
          {suggestions.map((suggestion) => (
            <article key={suggestion.id} className="suggestion-card">
              <span>{suggestion.severity}</span>
              <strong>{suggestion.title}</strong>
              <p>{suggestion.description}</p>
              {suggestion.action ? (
                <button type="button" disabled={readOnly} onClick={() => onApplySuggestion(suggestion)}>
                  Add {suggestion.action.label}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : !loading ? (
        <p className="muted">Run Analyze to get system design suggestions.</p>
      ) : null}
    </section>
  );
}
