import type { ArchitectureSuggestion } from "../../types/board";

type ArchitectureAssistPanelProps = {
  suggestions: ArchitectureSuggestion[];
};

export function ArchitectureAssistPanel({ suggestions }: ArchitectureAssistPanelProps) {
  return (
    <section>
      <span className="section-label">Architecture Assist</span>
      {suggestions.length > 0 ? (
        <div className="suggestions">
          {suggestions.map((suggestion) => (
            <article key={suggestion.id} className="suggestion-card">
              <span>{suggestion.severity}</span>
              <strong>{suggestion.title}</strong>
              <p>{suggestion.description}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">Run Analyze to get system design suggestions.</p>
      )}
    </section>
  );
}
