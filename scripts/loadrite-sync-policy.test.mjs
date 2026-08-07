import assert from "node:assert/strict";
import test from "node:test";
import { filterSyncableTicketRows, preserveExistingTicketStatuses } from "./loadrite-sync-policy.mjs";

test("preserves completed tickets when Loadrite returns them again", () => {
  const rows = preserveExistingTicketStatuses(
    [{ id: "LR-100", status: "pending", product: "Base" }],
    [{ id: "LR-100", status: "completed" }],
  );

  assert.equal(rows[0].status, "completed");
  assert.equal(rows[0].product, "Base");
});

test("preserves every existing workflow status", () => {
  const existingRows = [
    { id: "LR-1", status: "draft" },
    { id: "LR-2", status: "pending" },
    { id: "LR-3", status: "billable" },
    { id: "LR-4", status: "sent" },
    { id: "LR-5", status: "completed" },
  ];

  const rows = preserveExistingTicketStatuses(
    existingRows.map(({ id }) => ({ id, status: "pending" })),
    existingRows,
  );

  assert.deepEqual(
    rows.map(({ status }) => status),
    existingRows.map(({ status }) => status),
  );
});

test("new Loadrite tickets still enter the pending queue", () => {
  const rows = preserveExistingTicketStatuses(
    [{ id: "LR-NEW", status: "pending" }],
    [],
  );

  assert.equal(rows[0].status, "pending");
});

test("does not sync over finalized existing tickets", () => {
  const rows = filterSyncableTicketRows(
    [
      { id: "LR-PENDING", status: "pending" },
      { id: "LR-BILLABLE", status: "pending" },
      { id: "LR-COMPLETE", status: "pending" },
      { id: "LR-SENT", status: "pending" },
      { id: "LR-NEW", status: "pending" },
    ],
    [
      { id: "LR-PENDING", status: "pending" },
      { id: "LR-BILLABLE", status: "billable" },
      { id: "LR-COMPLETE", status: "completed" },
      { id: "LR-SENT", status: "sent" },
    ],
  );

  assert.deepEqual(
    rows.map(({ id }) => id),
    ["LR-PENDING", "LR-NEW"],
  );
});
