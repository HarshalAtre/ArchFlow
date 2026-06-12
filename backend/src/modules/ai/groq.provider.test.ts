import { describe, expect, it } from "vitest";

import { parseGroqJsonContent } from "./groq.provider.js";

describe("parseGroqJsonContent", () => {
  it("parses a direct JSON response", () => {
    expect(parseGroqJsonContent('{"suggestions":[]}')).toEqual({
      suggestions: [],
    });
  });

  it("extracts JSON from a fenced or explained response", () => {
    const content = '```json\n{"suggestions":[{"title":"Review"}]}\n```';

    expect(parseGroqJsonContent(content)).toEqual({
      suggestions: [{ title: "Review" }],
    });
  });

  it("rejects content without a JSON object", () => {
    expect(() => parseGroqJsonContent("No suggestions available.")).toThrow(
      "Groq returned analysis that was not valid JSON.",
    );
  });
});
