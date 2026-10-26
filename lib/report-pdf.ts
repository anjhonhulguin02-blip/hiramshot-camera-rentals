import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_BASE64 } from './logo-data';
import { unbase64 } from './crypto';
export type ReportRow = { created_at: string; booking_reference_code: string; transaction_type: string; amount_centavos: number; is_net_revenue: number; escrow_effect_centavos: number; payment_method: string };
export async function revenueReportPdf(rows: ReportRow[], period: string, timestamp: string) {
  const pdf = await PDFDocument.create(), regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), logo = await pdf.embedPng(unbase64(LOGO_BASE64));
  const ink = rgb(.118, .118, .118), muted = rgb(.38, .38, .38), orange = rgb(1, .353, .122);
  pdf.setTitle('HiramShot Revenue Ledger'); pdf.setAuthor('HiramShot Camera Rentals'); pdf.setCreationDate(new Date(timestamp));
  let page = pdf.addPage([841.89, 595.28]), y = 0;
  const text = (value: string) => value.replace(/[–—]/g, '-').replace(/[^\x20-\x7e]/g, '?');
  const money = (amount: number) => (amount / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const columns = [35, 112, 235, 470, 560, 650, 735];
  function header() {
    page.drawImage(logo, { x: 35, y: 510, width: 88, height: 58.4 });
    page.drawText('REVENUE & SECURITY DEPOSIT LEDGER', { x: 150, y: 551, size: 17, font: bold, color: ink });
    page.drawText(`Period: ${period} | Generated: ${timestamp}`, { x: 150, y: 531, size: 9, font: regular, color: muted });
    page.drawText('PHP cash-basis rental collections; refundable deposits are liabilities. This report is not a profit statement.', { x: 35, y: 491, size: 9, font: regular, color: muted });
    page.drawLine({ start: { x: 35, y: 479 }, end: { x: 807, y: 479 }, thickness: 1.2, color: orange });
    ['Date (UTC)', 'Booking reference', 'Transaction', 'Amount PHP', 'Rental income', 'Escrow effect', 'Method'].forEach((label, i) => page.drawText(label, { x: columns[i], y: 461, size: 8, font: bold, color: ink }));
    y = 440;
  }
  header();
  for (const row of rows) {
    if (y < 70) { page = pdf.addPage([841.89, 595.28]); header(); }
    const values = [row.created_at.slice(0, 10), row.booking_reference_code, row.transaction_type.replaceAll('_', ' '), money(row.amount_centavos), row.is_net_revenue ? money(row.amount_centavos) : '0.00', money(row.escrow_effect_centavos), row.payment_method];
    values.forEach((value, i) => page.drawText(text(value), { x: columns[i], y, size: i === 2 ? 7 : 8, font: regular, color: ink, maxWidth: i === 2 ? 248 : undefined }));
    page.drawLine({ start: { x: 35, y: y - 7 }, end: { x: 807, y: y - 7 }, thickness: .25, color: rgb(.85, .85, .85) }); y -= 25;
  }
  if (y < 115) { page = pdf.addPage([841.89, 595.28]); header(); }
  const revenue = rows.reduce((n, r) => n + (r.is_net_revenue ? r.amount_centavos : 0), 0), escrow = rows.reduce((n, r) => n + r.escrow_effect_centavos, 0);
  page.drawText(`Rental collections represented: PHP ${money(revenue)}   |   Deposit liability movement: PHP ${money(escrow)}`, { x: 35, y: y - 20, size: 10, font: bold, color: ink });
  page.drawText('Reclassifications and reversals preserve history. Demo entries are excluded. Store this business record securely.', { x: 35, y: y - 40, size: 8, font: regular, color: muted });
  const pages = pdf.getPages(); pages.forEach((p, i) => p.drawText(`HIRAMSHOT | CONFIDENTIAL BUSINESS RECORD | ${i + 1} / ${pages.length}`, { x: 35, y: 28, size: 7, font: regular, color: muted }));
  return pdf.save();
}
