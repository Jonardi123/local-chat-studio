import { describe, expect, it } from "vitest";
import { shouldSearchWeb, webEvidenceMessage } from "./web-search";

describe("automatic web search", () => {
  it.each([
    "What's the weather tomorrow?",
    "Who is the current CEO?",
    "Check Bitcoin's price",
    "Which team won the game?",
    "Find the newest llama.cpp release",
    "Browse for Vulkan news",
  ])("detects freshness need: %s", (prompt) =>
    expect(shouldSearchWeb(prompt)).toBe(true),
  );
  it.each(["Explain recursion", "Rewrite this email", "Why is the sky blue?"])(
    "avoids unnecessary search: %s",
    (prompt) => expect(shouldSearchWeb(prompt)).toBe(false),
  );
  it("tells the model it has live evidence and preserves citations", () => {
    const message = webEvidenceMessage(
      [{ title: "Example", url: "https://example.com", content: "Evidence" }],
      new Date("2026-08-23T12:00:00Z"),
    );
    expect(message).toContain("performed a live web search");
    expect(message).toContain("Do not say that you lack browsing");
    expect(message).toContain("https://example.com");
  });
});
