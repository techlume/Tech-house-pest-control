import { AppError } from './AppError.js';

export const OUTWARD_MOVEMENTS = [
  'ISSUE',
  'CONSUMPTION',
  'ADJUSTMENT_OUT',
  'TRANSFER_OUT',
];

export function stockAfterMovement(currentQuantity, requestedQuantity, type) {
  const current = Number(currentQuantity);
  const quantity = Number(requestedQuantity);
  if (!Number.isFinite(quantity) || quantity <= 0)
    throw new AppError(422, 'Stock movement quantity must be greater than zero');
  const outward = OUTWARD_MOVEMENTS.includes(type);
  if (outward && current < quantity)
    throw new AppError(409, 'Insufficient batch stock');
  return {
    quantity,
    newQuantity: current + (outward ? -quantity : quantity),
  };
}
