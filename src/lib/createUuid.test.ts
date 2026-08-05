import { describe, expect, it } from "vitest";
import { createUuid } from "./createUuid";

const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("createUuid", () => {
  it("uses the native UUID implementation when it is available", () => {
    const nativeUuid = "1228f65d-0fc6-4bba-9df3-a8d5a7f28688";

    expect(
      createUuid({
        randomUUID: () => nativeUuid,
      }),
    ).toBe(nativeUuid);
  });

  it("creates a valid UUID when randomUUID is unavailable over HTTP", () => {
    const uuid = createUuid({
      getRandomValues: (values) => {
        values.fill(17);
        return values;
      },
    });

    expect(uuid).toMatch(uuidV4Pattern);
  });

  it("keeps a valid UUID fallback when Web Crypto is unavailable", () => {
    expect(createUuid(null)).toMatch(uuidV4Pattern);
  });
});
