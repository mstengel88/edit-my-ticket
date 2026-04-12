export type MailFolderId = "inbox" | "starred" | "important" | "archive";

export type MailFolder = {
  id: MailFolderId;
  label: string;
  count: number;
};

export type MailMessage = {
  id: string;
  folder: MailFolderId;
  from: string;
  fromAddress: string;
  subject: string;
  preview: string;
  body: string[];
  receivedAt: string;
  unread: boolean;
  starred: boolean;
  important: boolean;
  tags: string[];
};

export type IonosConnectionPreset = {
  host: string;
  port: string;
  security: string;
};

export const ionosConnectionPresets: Record<"imap" | "smtp", IonosConnectionPreset> = {
  imap: {
    host: "imap.ionos.com",
    port: "993",
    security: "SSL/TLS",
  },
  smtp: {
    host: "smtp.ionos.com",
    port: "465",
    security: "SSL/TLS",
  },
};

export const mailFolders: MailFolder[] = [
  { id: "inbox", label: "Inbox", count: 12 },
  { id: "starred", label: "Starred", count: 3 },
  { id: "important", label: "Important", count: 5 },
  { id: "archive", label: "Archive", count: 27 },
];

export const sampleMessages: MailMessage[] = [
  {
    id: "msg-1001",
    folder: "inbox",
    from: "Support Team",
    fromAddress: "support@greenhills.example",
    subject: "Weekly hosting summary",
    preview: "Your mailbox stayed healthy this week and spam filtering caught 48 messages.",
    body: [
      "Hello Matt,",
      "Your hosting and mail services are running normally. Spam filtering caught 48 inbound messages and 3 messages were flagged for manual review.",
      "Open the queue from your mail reader whenever you are ready to inspect those flagged conversations.",
    ],
    receivedAt: "8:12 AM",
    unread: true,
    starred: false,
    important: true,
    tags: ["hosting", "status"],
  },
  {
    id: "msg-1002",
    folder: "inbox",
    from: "IONOS Billing",
    fromAddress: "billing@ionos.example",
    subject: "Invoice available for March",
    preview: "Your new invoice is ready to view in the billing center.",
    body: [
      "Hi,",
      "The invoice for your March services is now available. No action is required unless you want to download a PDF copy for your records.",
      "If you have questions, reply to this email and our billing desk will help.",
    ],
    receivedAt: "Yesterday",
    unread: false,
    starred: true,
    important: false,
    tags: ["billing"],
  },
  {
    id: "msg-1003",
    folder: "important",
    from: "Warehouse Alerts",
    fromAddress: "alerts@warehouse.example",
    subject: "Temperature warning in cold storage",
    preview: "Storage bay 4 reported a sustained rise above threshold for 14 minutes.",
    body: [
      "Heads up,",
      "Storage bay 4 stayed above the configured threshold for 14 minutes. Please verify the cooling system and confirm product safety.",
      "This notification remains pinned until someone marks the incident resolved.",
    ],
    receivedAt: "Yesterday",
    unread: true,
    starred: true,
    important: true,
    tags: ["alert", "operations"],
  },
  {
    id: "msg-1004",
    folder: "archive",
    from: "Customer Success",
    fromAddress: "customer.success@example.com",
    subject: "Thanks for the onboarding call",
    preview: "Sharing the recap and next actions we discussed on the call.",
    body: [
      "Thanks again for meeting with us.",
      "We attached the onboarding recap, migration checklist, and mailbox inventory from the session.",
      "Reach out whenever you want help connecting your IONOS mailbox to a dedicated reading app.",
    ],
    receivedAt: "Apr 6",
    unread: false,
    starred: false,
    important: false,
    tags: ["onboarding"],
  },
  {
    id: "msg-1005",
    folder: "starred",
    from: "Operations",
    fromAddress: "ops@example.com",
    subject: "Priority replies to review",
    preview: "Three customer replies are waiting for a human review before you answer.",
    body: [
      "Morning,",
      "Three conversations were grouped into the priority queue because they look time-sensitive.",
      "Use the reading pane to scan the thread quickly before deciding whether to respond from webmail.",
    ],
    receivedAt: "Apr 5",
    unread: true,
    starred: true,
    important: true,
    tags: ["queue", "priority"],
  },
];

export type MailReaderFilters = {
  folder: MailFolderId;
  query: string;
  unreadOnly: boolean;
};

export function getVisibleMessages(messages: MailMessage[], filters: MailReaderFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return messages.filter((message) => {
    const matchesFolder =
      filters.folder === "inbox"
        ? message.folder === "inbox"
        : filters.folder === "starred"
          ? message.starred
          : filters.folder === "important"
            ? message.important
            : message.folder === "archive";

    if (!matchesFolder) return false;
    if (filters.unreadOnly && !message.unread) return false;
    if (!normalizedQuery) return true;

    return [
      message.from,
      message.fromAddress,
      message.subject,
      message.preview,
      message.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}
