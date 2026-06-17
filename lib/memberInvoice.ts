// lib/memberInvoice.ts
// Professional member registration invoice generator

import { format } from "date-fns";
import type { PaymentMethod } from "@/types/member";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  card: "Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

export interface MemberInvoiceData {
  // Member details
  fullName: string;
  memberId?: string;
  contact?: string;

  // Membership details
  membershipType: "package" | "monthly";
  packageName?: string;
  monthlyFee: number;
  selectedMonthLabels?: string[];
  membershipStartDate?: string;
  nextPaymentDate?: string;

  // Payment details
  admissionFee: number;
  discount: number;
  subtotal: number;
  totalDue: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  invoiceNo?: string;

  // Business info
  businessName?: string;
  branchName?: string;
}

function safe(val: unknown, fallback = "N/A"): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string" && val.trim() === "") return fallback;
  return String(val);
}

function fmtMoney(n: number): string {
  return `\u09F3${n.toLocaleString("en-BD")}`;
}

export function openMemberInvoice(data: MemberInvoiceData): void {
  const invoiceNo = data.invoiceNo || "N/A";
  const now = new Date();
  const dateStr = format(now, "dd/MM/yyyy");
  const timeStr = format(now, "hh:mm a");

  const businessName = safe(data.businessName, "Silver GYM");
  const branchName = safe(data.branchName, "");
  const showBranch = branchName && branchName !== "N/A";

  const selectedMonths = data.selectedMonthLabels?.join(", ") || "N/A";

  const dueAmount = Math.max(0, data.totalDue - data.paidAmount);
  const exchangeAmount = Math.max(0, data.paidAmount - data.totalDue);
  const isPaid = data.paidAmount >= data.totalDue;
  const statusColor = isPaid ? "#16a34a" : "#dc2626";
  const statusText = isPaid ? "PAID" : "DUE";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Member Registration Invoice \u2013 ${invoiceNo}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a2e;
    background: #fff;
    padding: 20px 28px;
    line-height: 1.4;
    font-size: 12px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 3px solid #6c5ce7;
  }
  .brand h1 {
    font-size: 22px;
    font-weight: 800;
    color: #6c5ce7;
    letter-spacing: -0.5px;
  }
  .brand .branch {
    font-size: 12px;
    color: #64748b;
    margin-top: 1px;
  }
  .invoice-meta { text-align: right; }
  .invoice-meta .title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #6c5ce7;
    margin-bottom: 3px;
  }
  .invoice-meta .inv-number {
    font-size: 11px;
    color: #475569;
    font-family: 'Courier New', monospace;
  }
  .invoice-meta .date {
    font-size: 11px;
    color: #64748b;
    margin-top: 1px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #6c5ce7;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 2px solid #ede9fe;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 30px;
    margin-bottom: 12px;
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .info-row .label {
    font-size: 11px;
    color: #64748b;
  }
  .info-row .value {
    font-size: 11px;
    font-weight: 600;
    color: #1e293b;
    text-align: right;
    max-width: 55%;
  }

  .address-row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 12px;
  }
  .address-row .label {
    font-size: 11px;
    color: #64748b;
  }
  .address-row .value {
    font-size: 11px;
    font-weight: 600;
    color: #1e293b;
    text-align: right;
    max-width: 65%;
    word-break: break-word;
  }

  .payment-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    margin-bottom: 12px;
  }
  .payment-table td {
    padding: 5px 8px;
    font-size: 11px;
    border-bottom: 1px solid #f1f5f9;
  }
  .payment-table td:first-child {
    color: #64748b;
    width: 55%;
  }
  .payment-table td:last-child {
    font-weight: 600;
    color: #1e293b;
    text-align: right;
  }
  .payment-table .total-row td {
    font-size: 12px;
    font-weight: 700;
    color: #1a1a2e;
    border-top: 2px solid #6c5ce7;
    border-bottom: none;
    padding-top: 7px;
  }
  .payment-table .discount td:last-child { color: #16a34a; }
  .payment-table .exchange td:last-child { color: #2563eb; }
  .payment-table .due td:last-child { color: #dc2626; }
  .payment-table .status-row td { border-bottom: none; padding-top: 4px; }

  .status-badge {
    display: inline-block;
    padding: 2px 12px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #fff;
    background: ${statusColor};
  }

  .footer {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 2px solid #f1f5f9;
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
  }
  .footer .thanks {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 2px;
  }

  @media print {
    body { padding: 16px 24px; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="brand">
    <h1>${businessName}</h1>
    ${showBranch ? `<div class="branch">${branchName}</div>` : ""}
  </div>
  <div class="invoice-meta">
    <div class="title">Member Registration Invoice</div>
    <div class="inv-number">${invoiceNo}</div>
    <div class="date">${dateStr} ${timeStr}</div>
  </div>
</div>

<div class="section-title">Member Details</div>
<div class="info-grid">
  <div class="info-row"><span class="label">Full Name</span><span class="value">${safe(data.fullName)}</span></div>
  <div class="info-row"><span class="label">Contact</span><span class="value">${safe(data.contact)}</span></div>
  <div class="info-row"><span class="label">Member ID</span><span class="value">${safe(data.memberId)}</span></div>
</div>

<div class="section-title">Membership Details</div>
<div class="info-grid">
  <div class="info-row"><span class="label">Package</span><span class="value">${data.membershipType === "package" ? safe(data.packageName, "Custom Package") : "Monthly (No Package)"}</span></div>
  <div class="info-row"><span class="label">Monthly Fee</span><span class="value">${data.monthlyFee > 0 ? fmtMoney(data.monthlyFee) : "N/A"}</span></div>
  <div class="info-row"><span class="label">Duration</span><span class="value">${selectedMonths}</span></div>
  <div class="info-row"><span class="label">Start Date</span><span class="value">${data.membershipStartDate ? format(new Date(data.membershipStartDate), "dd/MM/yyyy") : "N/A"}</span></div>
  <div class="info-row"><span class="label">Next Payment</span><span class="value">${data.nextPaymentDate ? format(new Date(data.nextPaymentDate), "dd-MMM-yyyy") : "N/A"}</span></div>
</div>

<div class="section-title">Payment Summary</div>
<table class="payment-table">
  ${data.admissionFee > 0 ? `<tr><td>Admission Fee</td><td>+${fmtMoney(data.admissionFee)}</td></tr>` : ""}
  <tr><td>Subtotal</td><td>${fmtMoney(data.subtotal)}</td></tr>
  ${data.discount > 0 ? `<tr class="discount"><td>Discount</td><td>-${fmtMoney(data.discount)}</td></tr>` : ""}
  <tr class="total-row"><td>Total Amount</td><td>${fmtMoney(data.totalDue)}</td></tr>
  <tr><td>Paid Amount</td><td>${fmtMoney(data.paidAmount)}</td></tr>
  ${dueAmount > 0 ? `<tr class="due"><td>Due Amount</td><td>${fmtMoney(dueAmount)}</td></tr>` : ""}
  ${exchangeAmount > 0 ? `<tr class="exchange"><td>Exchange (Change)</td><td>${fmtMoney(exchangeAmount)}</td></tr>` : ""}
  <tr><td>Payment Method</td><td>${PAYMENT_METHOD_LABELS[data.paymentMethod] || safe(data.paymentMethod)}</td></tr>
  <tr class="status-row"><td>Status</td><td><span class="status-badge">${statusText}</span></td></tr>
</table>

<div class="footer">
  <div class="thanks">Thank you for choosing ${businessName}!</div>
  <div>For inquiries, please contact the front desk.</div>
</div>

</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=800,height=1000");
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 400);

  printWindow.onafterprint = () => {
    try { printWindow.close(); } catch { /* already closed */ }
  };

  setTimeout(() => {
    try { printWindow.close(); } catch { /* already closed */ }
  }, 30000);
}
