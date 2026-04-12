import { describe, expect, it } from "vitest";
import { getVisibleMessages, sampleMessages } from "./mailData";

describe("getVisibleMessages", () => {
  it("returns starred messages when the starred filter is selected", () => {
    const results = getVisibleMessages(sampleMessages, {
      folder: "starred",
      query: "",
      unreadOnly: false,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((message) => message.starred)).toBe(true);
  });

  it("matches search terms across sender and tags", () => {
    const results = getVisibleMessages(sampleMessages, {
      folder: "important",
      query: "temperature",
      unreadOnly: false,
    });

    expect(results.some((message) => message.id === "msg-1005")).toBe(true);
  });

  it("can narrow inbox results down to unread only", () => {
    const results = getVisibleMessages(sampleMessages, {
      folder: "inbox",
      query: "",
      unreadOnly: true,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((message) => message.folder === "inbox" && message.unread)).toBe(true);
  });
});
