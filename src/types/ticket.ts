export interface TicketData {
  id: string;
  source?: "manual" | "loadrite";
  jobNumber: string;
  jobName: string;
  dateTime: string;
  orderId?: string | null;
  orderSequence?: number | null;
  issuedAt?: string | null;

  // Company info
  companyName: string;
  companyEmail: string;
  companyWebsite: string;
  companyPhone: string;

  // Ticket details
  totalAmount: string;
  totalUnit: string;
  customer: string;
  product: string;
  truck: string;
  note: string;
  bucket: string;

  // Customer sign-off
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  signature: string;

  // Status
  status: "draft" | "pending" | "billable" | "sent" | "completed";
}

export const TICKET_TIME_ZONE = "America/Chicago";

export const formatTicketDateTime = (value: Date = new Date()) =>
  value.toLocaleString("en-US", {
    timeZone: TICKET_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: undefined,
    hour12: true,
  });

type UuidCrypto = Pick<Crypto, "getRandomValues"> &
  Partial<Pick<Crypto, "randomUUID">>;

export const createUuid = (provider: UuidCrypto = crypto) => {
  if (typeof provider.randomUUID === "function") {
    return provider.randomUUID();
  }

  const bytes = provider.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
};

export const createEmptyTicket = (jobNumber?: string, createdAt: Date = new Date()): TicketData => ({
  id: createUuid(),
  source: "manual",
  jobNumber: jobNumber ?? "MT-000001",
  jobName: "",
  dateTime: formatTicketDateTime(createdAt),
  orderId: null,
  orderSequence: null,
  issuedAt: null,
  companyName: "Green Hills Supply",
  companyEmail: "order@greenhillsupply.com",
  companyWebsite: "www.GreenHillsSupply.com",
  companyPhone: "262-345-4001",
  totalAmount: "0.00",
  totalUnit: "Ton",
  customer: "",
  product: "",
  truck: "",
  note: "",
  bucket: "",
  customerName: "",
  customerEmail: "",
  customerAddress: "",
  signature: "",
  status: "draft",
});

export const sampleTickets: TicketData[] = [
  {
    id: "1",
    source: "loadrite",
    jobNumber: "2531",
    jobName: "Job",
    dateTime: "2/19/2026 03:22 PM",
    orderId: null,
    orderSequence: null,
    issuedAt: null,
    companyName: "Green Hills Supply",
    companyEmail: "order@greenhillsupply.com",
    companyWebsite: "www.GreenHillsSupply.com",
    companyPhone: "262-345-4001",
    totalAmount: "1.97",
    totalUnit: "Ton",
    customer: "Pink Cleaning",
    product: "Eco-Blast Treated Salt",
    truck: "NOT SPECIFIED",
    note: "Undefined",
    bucket: "Bucket 04",
    customerName: "",
    customerEmail: "",
    customerAddress: "",
    signature: "",
    status: "sent",
  },
  {
    id: "2",
    source: "manual",
    jobNumber: "2530",
    jobName: "Delivery",
    dateTime: "2/19/2026 01:45 PM",
    orderId: null,
    orderSequence: null,
    issuedAt: null,
    companyName: "Green Hills Supply",
    companyEmail: "order@greenhillsupply.com",
    companyWebsite: "www.GreenHillsSupply.com",
    companyPhone: "262-345-4001",
    totalAmount: "3.42",
    totalUnit: "Ton",
    customer: "ABC Landscaping",
    product: "Road Salt Bulk",
    truck: "Truck 07",
    note: "Deliver to back lot",
    bucket: "Bucket 02",
    customerName: "Mike Davis",
    customerEmail: "mike@abclandscaping.com",
    customerAddress: "100 Industrial Pkwy, Milwaukee WI",
    signature: "",
    status: "completed",
  },
];
