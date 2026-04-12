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
  hasAttachment?: boolean;
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
    from: "Shopify",
    fromAddress: "support@shopify.com",
    subject: "A new device has logged in to your Shopify account",
    preview: "A new sign-in was detected and your account activity feed has been updated.",
    body: [
      "Hello Matt,",
      "We detected a login from a new device on your Shopify account. If this was you, no action is needed.",
      "If you do not recognize this activity, reset your password and review your recent sessions immediately.",
    ],
    receivedAt: "7:59 PM",
    unread: true,
    starred: false,
    important: true,
    tags: ["security", "shopify"],
  },
  {
    id: "msg-1002",
    folder: "inbox",
    from: "Menards",
    fromAddress: "offers@menards.com",
    subject: "Robotic Pool Cleaner ONLY $49.99 After Rebate*!",
    preview: "Fresh rebate deals landed in this week's promo mailer.",
    body: [
      "Matt,",
      "The newest Menards flyer includes seasonal deals, rebate offers, and featured inventory for the week.",
      "Open the full message if you want to scan store savings before the weekend.",
    ],
    receivedAt: "8:15 AM",
    unread: true,
    starred: false,
    important: false,
    tags: ["promo", "retail"],
  },
  {
    id: "msg-1003",
    folder: "inbox",
    from: "NoReply",
    fromAddress: "noreply@example.com",
    subject: "General Discussions",
    preview: "A new post was added to the shared discussion thread.",
    body: [
      "A fresh message was posted in General Discussions.",
      "Open the thread to review the latest notes and decide whether you want to respond from IONOS webmail.",
    ],
    receivedAt: "Yesterday",
    unread: false,
    starred: false,
    important: false,
    tags: ["discussion"],
  },
  {
    id: "msg-1004",
    folder: "important",
    from: "matt@greenhillswi.com",
    fromAddress: "matt@greenhillswi.com",
    subject: "PowerAlert Notification - Watchdog Ping Probe Okay from GHSServer",
    preview: "The watchdog service checked in successfully and all monitored endpoints responded.",
    body: [
      "This is a successful watchdog notification from GHSServer.",
      "All monitored endpoints responded within tolerance and no corrective action is required.",
    ],
    receivedAt: "Yesterday",
    unread: true,
    starred: false,
    important: true,
    tags: ["alert", "operations"],
  },
  {
    id: "msg-1005",
    folder: "important",
    from: "matt@greenhillswi.com",
    fromAddress: "matt@greenhillswi.com",
    subject: "PowerAlert Notification - Watchdog Ping Probe Failed from GHSServer",
    preview: "One or more endpoints failed the watchdog probe and may need immediate attention.",
    body: [
      "A watchdog probe failed on GHSServer.",
      "Check the affected endpoint, network path, and power status to confirm whether the outage is still active.",
    ],
    receivedAt: "Yesterday",
    unread: true,
    starred: true,
    important: true,
    tags: ["alert", "operations", "temperature"],
  },
  {
    id: "msg-1006",
    folder: "inbox",
    from: "Green Hills Supply",
    fromAddress: "sales@greenhillswi.com",
    subject: "Invoice #D6",
    preview: "The invoice is attached for your review.",
    body: [
      "Attached is invoice #D6.",
      "Please review line items and save it to your records if everything looks right.",
    ],
    receivedAt: "Yesterday",
    unread: false,
    starred: false,
    important: false,
    tags: ["invoice"],
    hasAttachment: true,
  },
  {
    id: "msg-1007",
    folder: "inbox",
    from: "Menards",
    fromAddress: "offers@menards.com",
    subject: "Warehouse Blowout Sale!",
    preview: "Additional markdowns are now live across seasonal categories.",
    body: [
      "This week's warehouse sale just went live.",
      "Open the message to browse discounted stock and rebate highlights.",
    ],
    receivedAt: "Yesterday",
    unread: false,
    starred: false,
    important: false,
    tags: ["promo"],
  },
  {
    id: "msg-1008",
    folder: "inbox",
    from: "Green Hills Supply",
    fromAddress: "sales@greenhillswi.com",
    subject: "Invoice #D5",
    preview: "Invoice #D5 is ready to review.",
    body: [
      "Invoice #D5 has been generated and attached.",
      "Open the message to review the details.",
    ],
    receivedAt: "Yesterday",
    unread: false,
    starred: false,
    important: false,
    tags: ["invoice"],
    hasAttachment: true,
  },
  {
    id: "msg-1009",
    folder: "inbox",
    from: "Green Hills Supply",
    fromAddress: "sales@greenhillswi.com",
    subject: "Invoice #D3",
    preview: "Invoice #D3 is attached for your files.",
    body: [
      "Invoice #D3 is attached.",
      "Open the file if you need a copy for accounting.",
    ],
    receivedAt: "Yesterday",
    unread: false,
    starred: false,
    important: false,
    tags: ["invoice"],
    hasAttachment: true,
  },
  {
    id: "msg-1010",
    folder: "starred",
    from: "Paul Kornmann",
    fromAddress: "paul@example.com",
    subject: "Re: Loadrite 360/Dispatch",
    preview: "Following up on the dispatch setup and latest status.",
    body: [
      "Checking back in on the Loadrite 360/Dispatch setup.",
      "Let me know if you want help validating the current configuration.",
    ],
    receivedAt: "Thursday",
    unread: true,
    starred: true,
    important: true,
    tags: ["dispatch", "operations"],
  },
  {
    id: "msg-1011",
    folder: "archive",
    from: "Menards",
    fromAddress: "offers@menards.com",
    subject: "Folding Step Stool ONLY $7.99 After Rebate*!",
    preview: "Another promo item was added to the weekly flyer.",
    body: [
      "This archived ad includes the folding step stool rebate promotion.",
      "Use archive search if you need to compare older promo mail.",
    ],
    receivedAt: "Thursday",
    unread: false,
    starred: false,
    important: false,
    tags: ["promo", "archive"],
  },
  {
    id: "msg-1012",
    folder: "archive",
    from: "Menards Weekly Flyer",
    fromAddress: "flyer@menards.com",
    subject: "Dr. Squatch Fresh Falls Soap ONLY $3.99 After Rebate* PLUS New Weekly Flyer!",
    preview: "Weekly flyer archive with fresh rebate items.",
    body: [
      "The latest flyer was saved to your archive.",
      "Search by sender or subject when you need to revisit old promotions.",
    ],
    receivedAt: "Thursday",
    unread: false,
    starred: false,
    important: false,
    tags: ["promo", "archive"],
  },
  {
    id: "msg-1013",
    folder: "archive",
    from: "Michael Anderson",
    fromAddress: "michael@example.com",
    subject: "Contractor pricing",
    preview: "Sharing contractor pricing and revised options.",
    body: [
      "Attached are the latest contractor pricing sheets.",
      "Let me know if you want an updated quote afterward.",
    ],
    receivedAt: "Tuesday",
    unread: false,
    starred: false,
    important: false,
    tags: ["pricing"],
    hasAttachment: true,
  },
  {
    id: "msg-1014",
    folder: "archive",
    from: "Michael Anderson",
    fromAddress: "michael@example.com",
    subject: "No subject",
    preview: "A short follow-up with an attachment.",
    body: [
      "Sending the file we discussed.",
      "Let me know if you need anything else on this one.",
    ],
    receivedAt: "Tuesday",
    unread: false,
    starred: false,
    important: false,
    tags: ["follow-up"],
    hasAttachment: true,
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
