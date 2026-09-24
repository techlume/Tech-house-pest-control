import { AppError } from './AppError.js';

const MAX_LINE_IMAGE_BYTES = 1_200_000; // ~1.2MB raw per line-item image
const LINE_IMAGE_DATA_URI_PATTERN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/;

/** Validates any per-line item images (Quotation/Invoice line.imageUrl) sent as base64 data URIs. */
export function assertValidLineImages(lines) {
  if (!Array.isArray(lines)) return;
  for (const line of lines) {
    if (!line?.imageUrl) continue;
    const match = line.imageUrl.match(LINE_IMAGE_DATA_URI_PATTERN);
    if (!match) continue; // already a hosted URL from a previous save — nothing to validate
    const approxBytes = (match[2].length * 3) / 4;
    if (approxBytes > MAX_LINE_IMAGE_BYTES) {
      throw new AppError(422, 'Item images must be under 1.2MB each — please compress the image and try again', 'ITEM_IMAGE_TOO_LARGE');
    }
  }
}

export function calculateInvoice(lines, gstTreatment = 'NON_GST') {
  if (!Array.isArray(lines) || !lines.length)
    throw new AppError(422, 'At least one invoice line is required');
  let subtotal = 0;
  let taxTotal = 0;
  const calculatedLines = lines.map((line) => {
    const quantity = Number(line.quantity);
    const rate = Number(line.rate);
    const taxRate = Number(line.taxRate || 0);
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw new AppError(422, 'Invoice quantity must be greater than zero');
    if (!Number.isFinite(rate) || rate < 0)
      throw new AppError(422, 'Invoice rate cannot be negative');
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)
      throw new AppError(422, 'Tax rate must be between 0 and 100');
    const base = quantity * rate;
    const tax = gstTreatment === 'GST' ? (base * taxRate) / 100 : 0;
    subtotal += base;
    taxTotal += tax;
    return { ...line, total: base + tax };
  });
  return {
    lines: calculatedLines,
    subtotal,
    taxTotal,
    grandTotal: subtotal + taxTotal,
  };
}

export function allocateReceipt(amount, invoices) {
  let remaining = Number(amount);
  if (!Number.isFinite(remaining) || remaining <= 0)
    throw new AppError(422, 'Receipt amount must be greater than zero');
  const outstanding = invoices.reduce(
    (total, invoice) => total + Number(invoice.dueAmount),
    0,
  );
  if (remaining > outstanding + 0.001)
    throw new AppError(
      422,
      'Receipt amount cannot exceed the customer outstanding balance',
    );
  const allocations = [];
  for (const invoice of invoices) {
    if (remaining <= 0) break;
    const allocated = Math.min(remaining, Number(invoice.dueAmount));
    allocations.push({ invoiceId: invoice._id, amount: allocated });
    remaining -= allocated;
  }
  if (!allocations.length) throw new AppError(409, 'No outstanding invoices');
  return { allocations, unallocatedAmount: remaining };
}
