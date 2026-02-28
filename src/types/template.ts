// Canvas-based template element
export interface CanvasElement {
  id: string;
  type: "field" | "label" | "divider" | "logo";
  // For "field" type — which ticket data key to display
  key?: string;
  // Display label (shown before value for field type, or as content for label type)
  label: string;
  // Static text content for "label" type
  content?: string;
  // Position & size in canvas units (canvas is 800x500)
  x: number;
  y: number;
  width: number;
  height: number;
  // Styling
  fontSize: number;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
  showLabel: boolean; // whether to show "Label: " prefix for field types
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const MIN_CANVAS_WIDTH = 400;
export const MAX_CANVAS_WIDTH = 1200;
export const MIN_CANVAS_HEIGHT = 250;
export const MAX_CANVAS_HEIGHT = 800;

// Available ticket data fields users can add
export const AVAILABLE_FIELDS: { key: string; label: string }[] = [
  { key: "jobNumber", label: "Ticket No" },
  { key: "jobName", label: "PO #" },
  { key: "dateTime", label: "Date/Time" },
  { key: "customer", label: "Customer" },
  { key: "customerEmail", label: "Customer Email" },
  { key: "customerAddress", label: "Customer Address" },
  { key: "product", label: "Product" },
  { key: "totalAmount", label: "Total Amount" },
  { key: "totalUnit", label: "Unit" },
  { key: "truck", label: "Truck" },
  { key: "bucket", label: "Bucket" },
  { key: "note", label: "Note" },
  { key: "customerName", label: "Received By" },
  { key: "companyName", label: "Company Name" },
  { key: "companyEmail", label: "Company Email" },
  { key: "companyWebsite", label: "Company Website" },
  { key: "companyPhone", label: "Company Phone" },
];

// Default canvas layout that mimics the original ticket design
export const DEFAULT_CANVAS_ELEMENTS: CanvasElement[] = [
  { id: "logo", type: "logo", label: "Logo", x: 20, y: 15, width: 80, height: 60, fontSize: 14, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "companyName", type: "field", key: "companyName", label: "Company", x: 110, y: 15, width: 250, height: 24, fontSize: 16, fontWeight: "bold", textAlign: "left", showLabel: false },
  { id: "companyWebsite", type: "field", key: "companyWebsite", label: "Website", x: 110, y: 40, width: 250, height: 18, fontSize: 11, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "companyEmail", type: "field", key: "companyEmail", label: "Email", x: 110, y: 56, width: 250, height: 18, fontSize: 11, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "companyPhone", type: "field", key: "companyPhone", label: "Phone", x: 110, y: 72, width: 250, height: 18, fontSize: 11, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "ticketNoLabel", type: "label", label: "Ticket No:", content: "Ticket No:", x: 620, y: 15, width: 160, height: 20, fontSize: 13, fontWeight: "normal", textAlign: "right", showLabel: false },
  { id: "jobNumber", type: "field", key: "jobNumber", label: "Ticket No", x: 620, y: 35, width: 160, height: 35, fontSize: 24, fontWeight: "bold", textAlign: "right", showLabel: false },
  { id: "divider1", type: "divider", label: "Divider", x: 20, y: 95, width: 760, height: 2, fontSize: 14, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "dateTime", type: "field", key: "dateTime", label: "Date", x: 20, y: 108, width: 370, height: 22, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "jobName", type: "field", key: "jobName", label: "Job", x: 400, y: 108, width: 380, height: 22, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "customer", type: "field", key: "customer", label: "Customer", x: 20, y: 135, width: 370, height: 22, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "truck", type: "field", key: "truck", label: "Truck", x: 400, y: 135, width: 380, height: 22, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "divider2", type: "divider", label: "Divider", x: 20, y: 165, width: 760, height: 2, fontSize: 14, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "product", type: "field", key: "product", label: "Product", x: 20, y: 178, width: 400, height: 22, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "totalAmount", type: "field", key: "totalAmount", label: "Total", x: 520, y: 175, width: 180, height: 30, fontSize: 22, fontWeight: "bold", textAlign: "right", showLabel: false },
  { id: "totalUnit", type: "field", key: "totalUnit", label: "Unit", x: 710, y: 182, width: 70, height: 22, fontSize: 13, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "divider3", type: "divider", label: "Divider", x: 20, y: 210, width: 760, height: 2, fontSize: 14, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "bucket", type: "field", key: "bucket", label: "Bucket", x: 20, y: 225, width: 370, height: 22, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "note", type: "field", key: "note", label: "Note", x: 400, y: 225, width: 380, height: 22, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "divider4", type: "divider", label: "Divider", x: 20, y: 255, width: 760, height: 2, fontSize: 14, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "receivedLabel", type: "label", label: "Received:", content: "Received :", x: 20, y: 270, width: 80, height: 20, fontSize: 11, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "customerName", type: "field", key: "customerName", label: "Received By", x: 105, y: 270, width: 400, height: 22, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: false },
];

// ---- Email template types ----

// Available fields for email templates (same as ticket fields)
export const EMAIL_AVAILABLE_FIELDS = AVAILABLE_FIELDS;

// Default ticket email canvas layout (table-friendly, horizontal rows)
export const DEFAULT_TICKET_EMAIL_ELEMENTS: CanvasElement[] = [
  { id: "e-logo", type: "logo", label: "Logo", x: 20, y: 12, width: 60, height: 48, fontSize: 14, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "e-companyName", type: "field", key: "companyName", label: "Company", x: 90, y: 12, width: 220, height: 22, fontSize: 16, fontWeight: "bold", textAlign: "left", showLabel: false },
  { id: "e-companyWebsite", type: "field", key: "companyWebsite", label: "Website", x: 90, y: 34, width: 220, height: 16, fontSize: 11, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "e-companyEmail", type: "field", key: "companyEmail", label: "Email", x: 90, y: 50, width: 220, height: 16, fontSize: 11, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "e-companyPhone", type: "field", key: "companyPhone", label: "Phone", x: 90, y: 66, width: 220, height: 16, fontSize: 11, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "e-ticketLabel", type: "label", label: "Ticket No:", content: "Ticket No:", x: 480, y: 12, width: 110, height: 18, fontSize: 13, fontWeight: "normal", textAlign: "right", showLabel: false },
  { id: "e-jobNumber", type: "field", key: "jobNumber", label: "Ticket No", x: 480, y: 30, width: 110, height: 30, fontSize: 22, fontWeight: "bold", textAlign: "right", showLabel: false },
  { id: "e-div1", type: "divider", label: "Divider", x: 16, y: 88, width: 568, height: 2, fontSize: 14, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "e-jobName", type: "field", key: "jobName", label: "Job", x: 16, y: 98, width: 280, height: 20, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "e-dateTime", type: "field", key: "dateTime", label: "Date", x: 300, y: 98, width: 290, height: 20, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "e-customer", type: "field", key: "customer", label: "Customer", x: 16, y: 122, width: 280, height: 20, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "e-truck", type: "field", key: "truck", label: "Truck", x: 300, y: 122, width: 290, height: 20, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "e-div2", type: "divider", label: "Divider", x: 16, y: 148, width: 568, height: 2, fontSize: 14, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "e-product", type: "field", key: "product", label: "Product", x: 16, y: 158, width: 300, height: 20, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: true },
  { id: "e-totalAmount", type: "field", key: "totalAmount", label: "Total", x: 400, y: 155, width: 120, height: 26, fontSize: 20, fontWeight: "bold", textAlign: "right", showLabel: false },
  { id: "e-totalUnit", type: "field", key: "totalUnit", label: "Unit", x: 530, y: 160, width: 60, height: 18, fontSize: 13, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "e-div3", type: "divider", label: "Divider", x: 16, y: 185, width: 568, height: 2, fontSize: 14, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "e-note", type: "field", key: "note", label: "Note", x: 16, y: 195, width: 574, height: 20, fontSize: 13, fontWeight: "normal", textAlign: "left", showLabel: true },
  { id: "e-receivedLabel", type: "label", label: "Received:", content: "Received:", x: 16, y: 220, width: 70, height: 18, fontSize: 11, fontWeight: "normal", textAlign: "left", showLabel: false },
  { id: "e-customerName", type: "field", key: "customerName", label: "Received By", x: 90, y: 220, width: 300, height: 20, fontSize: 13, fontWeight: "bold", textAlign: "left", showLabel: false },
];

export const EMAIL_CANVAS_WIDTH = 600;
export const EMAIL_CANVAS_HEIGHT = 260;

// Report email config (section-based, not full canvas)
export interface ReportEmailConfig {
  showSummaryCards: boolean;
  showCustomerBreakdown: boolean;
  showProductBreakdown: boolean;
  showTicketDetails: boolean;
  headerColor: string;
  accentColor: string;
}

export const DEFAULT_REPORT_EMAIL_CONFIG: ReportEmailConfig = {
  showSummaryCards: true,
  showCustomerBreakdown: true,
  showProductBreakdown: true,
  showTicketDetails: true,
  headerColor: "#222222",
  accentColor: "#f5f5f5",
};

// ---- Legacy types kept for backward compatibility with reports ----
export interface TemplateField {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  section: "header" | "details" | "product" | "footer";
}

export const DEFAULT_TEMPLATE_FIELDS: TemplateField[] = [
  { id: "dateTime", key: "dateTime", label: "Date", visible: true, section: "header" },
  { id: "jobName", key: "jobName", label: "Job", visible: true, section: "header" },
  { id: "customer", key: "customer", label: "Customer", visible: true, section: "header" },
  { id: "customerEmail", key: "customerEmail", label: "Customer Email", visible: true, section: "header" },
  { id: "product", key: "product", label: "Product", visible: true, section: "product" },
  { id: "totalAmount", key: "totalAmount", label: "Total Amount", visible: true, section: "product" },
  { id: "totalUnit", key: "totalUnit", label: "Total Unit", visible: true, section: "product" },
  { id: "truck", key: "truck", label: "Truck", visible: true, section: "footer" },
  { id: "bucket", key: "bucket", label: "Bucket", visible: true, section: "footer" },
  { id: "note", key: "note", label: "Note", visible: true, section: "footer" },
  { id: "customerName", key: "customerName", label: "Received By", visible: true, section: "footer" },
  { id: "customerAddress", key: "customerAddress", label: "Customer Address", visible: false, section: "footer" },
  { id: "signature", key: "signature", label: "Signature", visible: false, section: "footer" },
];

export interface ReportField {
  id: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_REPORT_FIELDS: ReportField[] = [
  { id: "jobNumber", label: "Job #", visible: true },
  { id: "jobName", label: "Job Name", visible: true },
  { id: "dateTime", label: "Date/Time", visible: true },
  { id: "customer", label: "Customer", visible: true },
  { id: "customerEmail", label: "Customer Email", visible: true },
  { id: "customerAddress", label: "Customer Address", visible: true },
  { id: "product", label: "Product", visible: true },
  { id: "truck", label: "Truck", visible: true },
  { id: "bucket", label: "Bucket", visible: true },
  { id: "totalAmount", label: "Amount", visible: true },
  { id: "totalUnit", label: "Unit", visible: true },
  { id: "note", label: "Note", visible: true },
  { id: "status", label: "Status", visible: true },
];
