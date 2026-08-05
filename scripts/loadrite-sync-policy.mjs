const DEFAULT_TICKET_STATUS = "pending";

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
