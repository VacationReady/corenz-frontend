import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type PdfColumn = { header: string; accessorKey: string };

// Lightweight client-side PDF table export. Optimized for preview-sized exports.
export async function exportTableToPdf(
  title: string,
  rows: Array<Record<string, any>>,
  columns: PdfColumn[],
): Promise<Blob> {
  const doc = await PDFDocument.create();
  let currentPage = doc.addPage();
  let { width, height } = currentPage.getSize();

  const margin = 36; // ~0.5in
  const contentWidth = width - margin * 2;
  let y = height - margin - 24;
  const lineHeight = 16;
  const headerGap = 8;

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Title
  currentPage.drawText(title, {
    x: margin,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight + headerGap;

  // Column layout
  const colCount = Math.max(1, columns.length);
  const colWidth = Math.max(70, Math.floor(contentWidth / colCount));

  // Headers
  columns.forEach((col, index) => {
    const x = margin + index * colWidth;
    currentPage.drawText(col.header, { x, y, size: 10, font: fontBold });
  });
  y -= lineHeight;

  // Rows
  for (const row of rows) {
    // Page break if needed
    if (y < margin + lineHeight) {
      currentPage = doc.addPage();
      ({ width, height } = currentPage.getSize());
      y = height - margin;
    }

    columns.forEach((col, index) => {
      const x = margin + index * colWidth;
      const value = String((row as any)[col.accessorKey] ?? "");
      currentPage.drawText(trimToWidth(value, colWidth, 9), {
        x,
        y,
        size: 9,
        font,
        color: rgb(0, 0, 0),
      });
    });
    y -= lineHeight;
  }

  const bytes = await doc.save();
  // Convert Uint8Array to ArrayBuffer slice compatible with BlobPart typing
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Blob([arrayBuffer], { type: "application/pdf" });
}

function trimToWidth(text: string, maxPx: number, size: number): string {
  // Approximate character width for Helvetica ~0.55*fontSize
  const maxChars = Math.max(4, Math.floor(maxPx / (size * 0.55)));
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}


