import { describe, expect, it } from "vitest";
import { createEmptyTicket, createUuid, formatTicketDateTime } from "./ticket";

describe("formatTicketDateTime", () => {
  it("formats summer timestamps in Central Daylight Time", () => {
    expect(formatTicketDateTime(new Date("2026-07-04T18:05:00Z"))).toBe("07/04/2026, 01:05 PM");
  });

  it("formats winter timestamps in Central Standard Time", () => {
    expect(formatTicketDateTime(new Date("2026-01-04T18:05:00Z"))).toBe("01/04/2026, 12:05 PM");
  });

  it("uses the Central formatter for new manual tickets", () => {
    const now = new Date("2026-07-04T18:05:00Z");
    const ticket = createEmptyTicket("MT-000123", now);
    expect(ticket.source).toBe("manual");
    expect(ticket.dateTime).toBe("07/04/2026, 01:05 PM");
  });
});

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
