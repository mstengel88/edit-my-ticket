export interface TemplateField {
  id: string;
  key: string;
  label: string;
  visible: boolean;
  section: "header" | "details" | "product" | "footer";
}

export const DEFAULT_TEMPLATE_FIELDS: TemplateField[] = [
  // Header section
  { id: "dateTime", key: "dateTime", label: "Date", visible: true, section: "header" },
  { id: "jobName", key: "jobName", label: "Job", visible: true, section: "header" },
  { id: "customer", key: "customer", label: "Customer", visible: true, section: "header" },
  { id: "customerEmail", key: "customerEmail", label: "Customer Email", visible: true, section: "header" },

  // Product section
  { id: "product", key: "product", label: "Product", visible: true, section: "product" },
  { id: "totalAmount", key: "totalAmount", label: "Total Amount", visible: true, section: "product" },
  { id: "totalUnit", key: "totalUnit", label: "Total Unit", visible: true, section: "product" },

  // Details/footer section
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
