import { describe, expect, it } from "vitest";
import { createUuid } from "./ticket";

describe("createUuid", () => {
  it("creates a UUID when randomUUID is unavailable on an HTTP origin", () => {
    const provider = {
      getRandomValues: <T extends ArrayBufferView | null>(values: T): T => {
        const bytes = values as Uint8Array;
        bytes.forEach((_, index) => {
          bytes[index] = index;
        });
        return values;
      },
    };

    expect(createUuid(provider)).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });
});
