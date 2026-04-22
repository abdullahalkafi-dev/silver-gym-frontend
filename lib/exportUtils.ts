// lib/exportUtils.ts
// Reusable PDF and Excel export utility for Income and Expense reports.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  /** Key of the data object to read the value from */
  key: string;
  /** Optional custom formatter. Return a string. */
  formatter?: (
    value: unknown,
    row: Record<string, unknown>,
  ) => string;
}

export interface ExportConfig {
  /** Data rows – each row is a plain object */
  data: Record<string, unknown>[];
  /** Column definitions */
  columns: ExportColumn[];
  /** Report title, e.g. "Income Report" */
  title: string;
  /** Optional subtitle shown below the title, e.g. business name */
  subtitle?: string;
  /**
   * ISO-date field name on each row to use for date-range filtering.
   * If omitted, all rows are included regardless of dates.
   */
  dateField?: string;
  /**
   * Numeric field name on each row to sum as the "Total Amount".
   * If omitted, no total amount line is shown.
   */
  amountField?: string;
  /** Start of date filter (inclusive) */
  startDate?: Date;
  /** End of date filter (inclusive, end-of-day) */
  endDate?: Date;
  /** Output filename without extension */
  filename?: string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function normalizeStartOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function normalizeEndOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function filterRows(
  data: Record<string, unknown>[],
  dateField: string | undefined,
  startDate: Date | undefined,
  endDate: Date | undefined,
): Record<string, unknown>[] {
  if (!dateField || !startDate || !endDate) return data;

  const start = normalizeStartOfDay(startDate);
  const end = normalizeEndOfDay(endDate);

  return data.filter((row) => {
    const raw = row[dateField];
    if (!raw) return false;
    const d = new Date(raw as string);
    if (isNaN(d.getTime())) return false;
    return d >= start && d <= end;
  });
}

function getCellValue(
  row: Record<string, unknown>,
  col: ExportColumn,
): string {
  const raw = row[col.key];
  if (col.formatter) return col.formatter(raw, row);
  if (raw === undefined || raw === null) return "";
  return String(raw);
}

function sumAmount(
  rows: Record<string, unknown>[],
  amountField: string | undefined,
): number {
  if (!amountField) return 0;
  return rows.reduce((acc, row) => {
    const v = row[amountField];
    const n = typeof v === "number" ? v : parseFloat(String(v ?? 0));
    return acc + (isNaN(n) ? 0 : n);
  }, 0);
}

function buildDateRangeLabel(
  startDate?: Date,
  endDate?: Date,
): string {
  if (!startDate || !endDate) return "All dates";
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

// ─── PDF export ──────────────────────────────────────────────────────────────

export function exportToPDF(config: ExportConfig): void {
  const {
    data,
    columns,
    title,
    subtitle,
    dateField,
    amountField,
    startDate,
    endDate,
    filename,
  } = config;

  const filtered = filterRows(data, dateField, startDate, endDate);
  const total = sumAmount(filtered, amountField);
  const dateLabel = buildDateRangeLabel(startDate, endDate);

  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(title, 14, 20);

  // Subtitle / business name
  let currentY = 28;
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(subtitle, 14, currentY);
    currentY += 7;
  }

  // Date range + stats
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Date Range: ${dateLabel}`, 14, currentY);
  currentY += 6;
  doc.text(`Total Records: ${filtered.length}`, 14, currentY);
  currentY += 6;

  if (amountField) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(124, 58, 237); // purple
    doc.text(`Total Amount: ${total.toFixed(2)}`, 14, currentY);
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
  }

  currentY += 2;

  // Table
  const head = [columns.map((c) => c.header)];
  const body = filtered.map((row) => columns.map((col) => getCellValue(row, col)));

  autoTable(doc, {
    head,
    body,
    startY: currentY,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [40, 40, 40],
    },
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 245, 255] },
    margin: { left: 14, right: 14 },
    tableLineColor: [220, 220, 220],
    tableLineWidth: 0.1,
  });

  const outputFilename = filename
    ? `${filename}.pdf`
    : `${title.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
  doc.save(outputFilename);
}

// ─── Excel export ────────────────────────────────────────────────────────────

export function exportToExcel(config: ExportConfig): void {
  const {
    data,
    columns,
    title,
    subtitle,
    dateField,
    amountField,
    startDate,
    endDate,
    filename,
  } = config;

  const filtered = filterRows(data, dateField, startDate, endDate);
  const total = sumAmount(filtered, amountField);
  const dateLabel = buildDateRangeLabel(startDate, endDate);

  const wsData: unknown[][] = [];

  // Row 1: Title (bold, later styled)
  wsData.push([title]);

  // Row 2: Subtitle (optional)
  if (subtitle) wsData.push([subtitle]);

  // Row 3: Date range
  wsData.push([`Date Range: ${dateLabel}`]);

  // Row 4: Record count
  wsData.push([`Total Records: ${filtered.length}`]);

  // Row 5: blank separator
  wsData.push([]);

  const headerRowIndex = wsData.length; // 0-based

  // Header row
  wsData.push(columns.map((c) => c.header));

  // Data rows
  filtered.forEach((row) => {
    wsData.push(
      columns.map((col) => {
        const raw = row[col.key];
        if (col.formatter) return col.formatter(raw, row);
        if (amountField && col.key === amountField) {
          const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? 0));
          return isNaN(n) ? 0 : n;
        }
        return raw ?? "";
      }),
    );
  });

  // Total row
  if (amountField) {
    const amountColIndex = columns.findIndex((c) => c.key === amountField);
    const totalRow: unknown[] = columns.map((_, i) => {
      if (i === 0) return "TOTAL";
      if (i === amountColIndex) return total;
      return "";
    });
    wsData.push(totalRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ── Cell styling via raw s property ─────────────────────────────────────────
  const titleCellRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleCellRef]) {
    ws[titleCellRef].s = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: "left" },
    };
  }

  const headerRow = headerRowIndex;
  columns.forEach((_, ci) => {
    const cellRef = XLSX.utils.encode_cell({ r: headerRow, c: ci });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "7C3AED" } },
        alignment: { horizontal: "center" },
      };
    }
  });

  // Style total row
  if (amountField) {
    const totalRowIndex = wsData.length - 1;
    columns.forEach((_, ci) => {
      const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: ci });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "F3EEFF" } },
        };
      }
    });
  }

  // Column widths (auto)
  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.header.length,
      ...filtered.map((row) => {
        const v = getCellValue(row, col);
        return v.length;
      }),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
  ws["!cols"] = colWidths;

  // Merge title cell across all columns
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));

  const outputFilename = filename
    ? `${filename}.xlsx`
    : `${title.replace(/\s+/g, "_")}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, outputFilename);
}
