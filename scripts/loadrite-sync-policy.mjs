const DEFAULT_TICKET_STATUS = "pending";
const FINALIZED_TICKET_STATUSES = new Set(["billable", "completed", "delivered", "done", "sent"]);

export function preserveExistingTicketStatuses(incomingRows, existingRows) {
  const existingStatusById = new Map(
    (Array.isArray(existingRows) ? existingRows : [])
      .filter((row) => row?.id && row?.status)
      .map((row) => [String(row.id), String(row.status)]),
  );

  return (Array.isArray(incomingRows) ? incomingRows : []).map((row) => ({
    ...row,
    status: existingStatusById.get(String(row.id)) ?? row.status ?? DEFAULT_TICKET_STATUS,
  }));
}

export function filterSyncableTicketRows(incomingRows, existingRows) {
  const existingStatusById = new Map(
    (Array.isArray(existingRows) ? existingRows : [])
      .filter((row) => row?.id && row?.status)
      .map((row) => [String(row.id), String(row.status).toLowerCase()]),
  );

  return (Array.isArray(incomingRows) ? incomingRows : []).filter((row) => {
    const existingStatus = existingStatusById.get(String(row?.id ?? ""));
    return !existingStatus || !FINALIZED_TICKET_STATUSES.has(existingStatus);
  });
}
