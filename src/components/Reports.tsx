import { useState, useMemo } from "react";
import { TicketData } from "@/types/ticket";
import { ReportField, DEFAULT_REPORT_FIELDS } from "@/types/template";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CalendarIcon, Printer, Mail } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";

type TimePeriod = "today" | "yesterday" | "weekly" | "monthly" | "yearly" | "custom";

interface ReportsProps {
  tickets: TicketData[];
  reportFields?: ReportField[];
}

function parseTicketDate(dateTime: string): Date | null {
  if (!dateTime) return null;
  const d = new Date(dateTime);
  return isNaN(d.getTime()) ? null : d;
}

export function Reports({ tickets, reportFields }: ReportsProps) {
  const [period, setPeriod] = useState<TimePeriod>("today");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const rFields = reportFields || DEFAULT_REPORT_FIELDS;
  const rVisible = (id: string) => rFields.find((f) => f.id === id)?.visible ?? true;

  const now = new Date();

  const dateRange = useMemo((): { from: Date; to: Date } => {
    switch (period) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "yesterday":
        return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
      case "weekly":
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
      case "monthly":
        return { from: startOfMonth(now), to: endOfDay(now) };
      case "yearly":
        return { from: startOfYear(now), to: endOfDay(now) };
      case "custom":
        return {
          from: customFrom ? startOfDay(customFrom) : startOfDay(now),
          to: customTo ? endOfDay(customTo) : endOfDay(now),
        };
    }
  }, [period, customFrom, customTo]);

  const customers = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.customer && t.customer.trim()) set.add(t.customer.trim());
    });
    return Array.from(set).sort();
  }, [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const d = parseTicketDate(t.dateTime);
      if (!d) return false;
      if (d < dateRange.from || d > dateRange.to) return false;
      if (customerFilter !== "all" && t.customer.trim() !== customerFilter) return false;
      return true;
    });
  }, [tickets, dateRange, customerFilter]);

  const summary = useMemo(() => {
    let totalTons = 0;
    let totalYards = 0;
    const byCustomer: Record<string, { tons: number; yards: number; count: number }> = {};
    const byProduct: Record<string, { tons: number; yards: number; count: number }> = {};

    filtered.forEach((t) => {
      const amount = parseFloat(t.totalAmount) || 0;
      const isTon = (t.totalUnit || "").toLowerCase().includes("ton");
      const isYard = (t.totalUnit || "").toLowerCase().includes("yard");

      if (isTon) totalTons += amount;
      if (isYard) totalYards += amount;

      const cust = t.customer.trim() || "Unknown";
      if (!byCustomer[cust]) byCustomer[cust] = { tons: 0, yards: 0, count: 0 };
      byCustomer[cust].count++;
      if (isTon) byCustomer[cust].tons += amount;
      if (isYard) byCustomer[cust].yards += amount;

      const prod = t.product.trim() || "Unknown";
      if (!byProduct[prod]) byProduct[prod] = { tons: 0, yards: 0, count: 0 };
      byProduct[prod].count++;
      if (isTon) byProduct[prod].tons += amount;
      if (isYard) byProduct[prod].yards += amount;
    });

    return { totalTons, totalYards, byCustomer, byProduct, ticketCount: filtered.length };
  }, [filtered]);

  const periodLabel: Record<TimePeriod, string> = {
    today: "Today",
    yesterday: "Yesterday",
    weekly: "This Week",
    monthly: "This Month",
    yearly: "This Year",
    custom: "Custom Range",
  };

  const [printSection, setPrintSection] = useState<"all" | "tickets" | "customer" | "product">("all");

  const handlePrint = () => {
    const sections = document.querySelectorAll("[data-report-section]");
    sections.forEach((el) => {
      const section = el.getAttribute("data-report-section");
      if (printSection === "all") {
        (el as HTMLElement).classList.remove("print-hidden");
      } else {
        if (section === printSection || section === "summary") {
          (el as HTMLElement).classList.remove("print-hidden");
        } else {
          (el as HTMLElement).classList.add("print-hidden");
        }
      }
    });
    setTimeout(() => {
      window.print();
      sections.forEach((el) => (el as HTMLElement).classList.remove("print-hidden"));
    }, 100);
  };

  const buildReportText = () => {
    const lines: string[] = [];
    lines.push(`Report: ${periodLabel[period]} (${format(dateRange.from, "MM/dd/yyyy")} – ${format(dateRange.to, "MM/dd/yyyy")})`);
    if (customerFilter !== "all") lines.push(`Customer: ${customerFilter}`);
    lines.push("");
    lines.push(`Total Tickets: ${summary.ticketCount}`);
    lines.push(`Total Tonnage: ${summary.totalTons.toFixed(2)}`);
    lines.push(`Total Yardage: ${summary.totalYards.toFixed(2)}`);
    lines.push("");
    lines.push("--- Ticket Details ---");
    filtered.sort((a, b) => a.jobNumber.localeCompare(b.jobNumber)).forEach((t) => {
      const parts: string[] = [];
      if (rVisible("jobNumber")) parts.push(`Job#: ${t.jobNumber}`);
      if (rVisible("dateTime")) parts.push(`Date: ${t.dateTime}`);
      if (rVisible("customer")) parts.push(`Customer: ${t.customer}`);
      if (rVisible("product")) parts.push(`Product: ${t.product}`);
      if (rVisible("totalAmount")) parts.push(`Amount: ${t.totalAmount}`);
      if (rVisible("totalUnit")) parts.push(`Unit: ${t.totalUnit}`);
      if (rVisible("truck")) parts.push(`Truck: ${t.truck}`);
      lines.push(parts.join(" | "));
    });
    return lines.join("\n");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Report: ${periodLabel[period]} - ${format(dateRange.from, "MM/dd/yyyy")}`);
    const body = encodeURIComponent(buildReportText());
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Report Filters</CardTitle>
          <div className="flex gap-2 items-center no-print">
            <Select value={printSection} onValueChange={(v) => setPrintSection(v as typeof printSection)}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Print All</SelectItem>
                <SelectItem value="tickets">Tickets Only</SelectItem>
                <SelectItem value="customer">By Customer</SelectItem>
                <SelectItem value="product">By Product</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleEmail} className="gap-1.5">
              <Mail className="h-4 w-4" /> Email
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Time Period</label>
              <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="yearly">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === "custom" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">From</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customFrom ? format(customFrom, "MM/dd/yyyy") : "Start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">To</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customTo ? format(customTo, "MM/dd/yyyy") : "End"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Customer</label>
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-report-section="summary">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Tickets</p>
            <p className="text-3xl font-bold text-foreground">{summary.ticketCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Tonnage</p>
            <p className="text-3xl font-bold text-foreground">{summary.totalTons.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Yardage</p>
            <p className="text-3xl font-bold text-foreground">{summary.totalYards.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* By Customer */}
      <Card data-report-section="customer">
        <CardHeader>
          <CardTitle className="text-base">By Customer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead className="text-right">Tons</TableHead>
                <TableHead className="text-right">Yards</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summary.byCustomer)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cust, data]) => (
                  <TableRow key={cust}>
                    <TableCell className="font-medium">{cust}</TableCell>
                    <TableCell className="text-right">{data.count}</TableCell>
                    <TableCell className="text-right">{data.tons.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{data.yards.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              {Object.keys(summary.byCustomer).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data for this period</TableCell>
                </TableRow>
              )}
            </TableBody>
            {Object.keys(summary.byCustomer).length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{summary.ticketCount}</TableCell>
                  <TableCell className="text-right font-bold">{summary.totalTons.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">{summary.totalYards.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* By Product */}
      <Card data-report-section="product">
        <CardHeader>
          <CardTitle className="text-base">By Product</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Tickets</TableHead>
                <TableHead className="text-right">Tons</TableHead>
                <TableHead className="text-right">Yards</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summary.byProduct)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([prod, data]) => (
                  <TableRow key={prod}>
                    <TableCell className="font-medium">{prod}</TableCell>
                    <TableCell className="text-right">{data.count}</TableCell>
                    <TableCell className="text-right">{data.tons.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{data.yards.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              {Object.keys(summary.byProduct).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data for this period</TableCell>
                </TableRow>
              )}
            </TableBody>
            {Object.keys(summary.byProduct).length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{summary.ticketCount}</TableCell>
                  <TableCell className="text-right font-bold">{summary.totalTons.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">{summary.totalYards.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* All Tickets Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {rVisible("jobNumber") && <TableHead>Job #</TableHead>}
                {rVisible("jobName") && <TableHead>Job Name</TableHead>}
                {rVisible("dateTime") && <TableHead>Date/Time</TableHead>}
                {rVisible("customer") && <TableHead>Customer</TableHead>}
                {rVisible("customerEmail") && <TableHead>Customer Email</TableHead>}
                {rVisible("customerAddress") && <TableHead>Customer Address</TableHead>}
                {rVisible("product") && <TableHead>Product</TableHead>}
                {rVisible("truck") && <TableHead>Truck</TableHead>}
                {rVisible("bucket") && <TableHead>Bucket</TableHead>}
                {rVisible("totalAmount") && <TableHead className="text-right">Amount</TableHead>}
                {rVisible("totalUnit") && <TableHead>Unit</TableHead>}
                {rVisible("note") && <TableHead>Note</TableHead>}
                {rVisible("status") && <TableHead>Status</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered
                .sort((a, b) => a.jobNumber.localeCompare(b.jobNumber))
                .map((t) => (
                  <TableRow key={t.id}>
                    {rVisible("jobNumber") && <TableCell className="font-medium">{t.jobNumber}</TableCell>}
                    {rVisible("jobName") && <TableCell>{t.jobName}</TableCell>}
                    {rVisible("dateTime") && <TableCell className="whitespace-nowrap">{t.dateTime}</TableCell>}
                    {rVisible("customer") && <TableCell>{t.customer}</TableCell>}
                    {rVisible("customerEmail") && <TableCell>{t.customerEmail}</TableCell>}
                    {rVisible("customerAddress") && <TableCell>{t.customerAddress}</TableCell>}
                    {rVisible("product") && <TableCell>{t.product}</TableCell>}
                    {rVisible("truck") && <TableCell>{t.truck}</TableCell>}
                    {rVisible("bucket") && <TableCell>{t.bucket}</TableCell>}
                    {rVisible("totalAmount") && <TableCell className="text-right">{t.totalAmount}</TableCell>}
                    {rVisible("totalUnit") && <TableCell>{t.totalUnit}</TableCell>}
                    {rVisible("note") && <TableCell>{t.note}</TableCell>}
                    {rVisible("status") && <TableCell className="capitalize">{t.status}</TableCell>}
                  </TableRow>
                ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={rFields.filter(f => f.visible).length || 1} className="text-center text-muted-foreground py-8">No tickets for this period</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
