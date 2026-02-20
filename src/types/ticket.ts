export interface TicketData {
  id: string;
  jobNumber: string;
  jobName: string;
  dateTime: string;

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
  status: "draft" | "sent" | "completed";
}

export const createEmptyTicket = (): TicketData => ({
  id: crypto.randomUUID(),
  jobNumber: String(Math.floor(Math.random() * 9000) + 1000),
  jobName: "",
  dateTime: new Date().toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: undefined,
    hour12: true,
  }),
  companyName: "Green Hills Supply",
  companyEmail: "order@greenhillsupply.com",
  companyWebsite: "www.GreenHillsSupply.com",
  companyPhone: "262-345-4001",
  totalAmount: "0.00",
  totalUnit: "Ton",
  customer: "",
  product: "",
  truck: "NOT SPECIFIED",
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
    jobNumber: "2531",
    jobName: "Job",
    dateTime: "2/19/2026 03:22 PM",
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
    jobNumber: "2530",
    jobName: "Delivery",
    dateTime: "2/19/2026 01:45 PM",
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
    customerAddress: "100 Industrial Pkwy, Milwaukee WI",
    signature: "",
    status: "completed",
  },
];
