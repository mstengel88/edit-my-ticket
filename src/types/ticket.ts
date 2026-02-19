export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface TicketData {
  id: string;
  ticketNumber: string;
  date: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue";

  // Company info
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;

  // Customer info
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;

  // Items
  lineItems: LineItem[];

  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;

  // Additional
  notes: string;
  terms: string;
}

export const createEmptyTicket = (): TicketData => ({
  id: crypto.randomUUID(),
  ticketNumber: `TKT-${String(Math.floor(Math.random() * 9000) + 1000)}`,
  date: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  status: "draft",
  companyName: "Your Company Name",
  companyAddress: "123 Business St, Suite 100\nCity, State 12345",
  companyPhone: "(555) 123-4567",
  companyEmail: "billing@company.com",
  customerName: "Customer Name",
  customerAddress: "456 Customer Ave\nCity, State 67890",
  customerPhone: "(555) 987-6543",
  customerEmail: "customer@email.com",
  lineItems: [
    {
      id: crypto.randomUUID(),
      description: "Service or product description",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    },
  ],
  subtotal: 0,
  taxRate: 0,
  taxAmount: 0,
  discount: 0,
  total: 0,
  notes: "",
  terms: "Payment due within 30 days.",
});

// Sample data for demo
export const sampleTickets: TicketData[] = [
  {
    id: "1",
    ticketNumber: "TKT-1001",
    date: "2026-02-15",
    dueDate: "2026-03-17",
    status: "sent",
    companyName: "Acme Services LLC",
    companyAddress: "123 Main Street, Suite 200\nAustin, TX 78701",
    companyPhone: "(512) 555-0100",
    companyEmail: "billing@acmeservices.com",
    customerName: "John Smith",
    customerAddress: "789 Oak Lane\nDallas, TX 75201",
    customerPhone: "(214) 555-0200",
    customerEmail: "john.smith@email.com",
    lineItems: [
      { id: "a", description: "HVAC Maintenance - Quarterly", quantity: 1, unitPrice: 250, total: 250 },
      { id: "b", description: "Filter Replacement (4x)", quantity: 4, unitPrice: 35, total: 140 },
      { id: "c", description: "Duct Cleaning", quantity: 1, unitPrice: 180, total: 180 },
    ],
    subtotal: 570,
    taxRate: 8.25,
    taxAmount: 47.03,
    discount: 0,
    total: 617.03,
    notes: "Thank you for your business!",
    terms: "Payment due within 30 days. Late fees may apply.",
  },
  {
    id: "2",
    ticketNumber: "TKT-1002",
    date: "2026-02-18",
    dueDate: "2026-03-20",
    status: "draft",
    companyName: "Acme Services LLC",
    companyAddress: "123 Main Street, Suite 200\nAustin, TX 78701",
    companyPhone: "(512) 555-0100",
    companyEmail: "billing@acmeservices.com",
    customerName: "Sarah Johnson",
    customerAddress: "321 Elm Dr\nHouston, TX 77001",
    customerPhone: "(713) 555-0300",
    customerEmail: "sarah.j@email.com",
    lineItems: [
      { id: "d", description: "Plumbing Repair - Kitchen Sink", quantity: 1, unitPrice: 175, total: 175 },
      { id: "e", description: "Parts & Materials", quantity: 1, unitPrice: 65, total: 65 },
    ],
    subtotal: 240,
    taxRate: 8.25,
    taxAmount: 19.80,
    discount: 10,
    total: 249.80,
    notes: "Warranty: 90 days on labor.",
    terms: "Payment due upon completion.",
  },
];
