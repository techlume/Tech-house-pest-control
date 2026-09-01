import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { AppError } from '../utils/AppError.js';

/**
 * Validates every requested batch before changing stock, then performs guarded
 * atomic deductions. Successful deductions are mirrored by append-only stock
 * movements. The guarded update prevents stock from becoming negative.
 */
export async function consumeJobChemicals({ chemicals = [], visit, actorId }) {
  if (!chemicals.length) return [];

  const prepared = [];
  for (const chemical of chemicals) {
    if (!chemical.productId || !chemical.batchId || Number(chemical.quantity) <= 0) {
      throw new AppError(422, 'Each chemical requires a product, batch and positive quantity', 'INVALID_CHEMICAL_USAGE');
    }
    const product = await Product.findOne({
      _id: chemical.productId,
      companyId: visit.companyId,
      branchId: visit.branchId,
      active: true
    });
    const batch = product?.batches.id(chemical.batchId);
    if (!product || !batch) throw new AppError(404, 'Selected chemical batch was not found', 'BATCH_NOT_FOUND');
    if (batch.quantity < Number(chemical.quantity)) {
      throw new AppError(409, `Insufficient stock for ${product.name}, batch ${batch.batchNo}`, 'INSUFFICIENT_STOCK');
    }
    prepared.push({ chemical, product, batch });
  }

  const completed = [];
  try {
    for (const item of prepared) {
      const quantity = Number(item.chemical.quantity);
      const result = await Product.updateOne(
        { _id: item.product._id, companyId: visit.companyId, branchId: visit.branchId, batches: { $elemMatch: { _id: item.batch._id, quantity: { $gte: quantity } } } },
        { $inc: { 'batches.$[batch].quantity': -quantity }, $set: { updatedBy: actorId } },
        { arrayFilters: [{ 'batch._id': item.batch._id }] }
      );
      if (!result.modifiedCount) throw new AppError(409, `Stock changed while completing ${item.product.name}; review and retry`, 'STOCK_CONFLICT');
      completed.push({ ...item, quantity });
    }
  } catch (error) {
    await Promise.all(completed.map(item => Product.updateOne(
      { _id: item.product._id, 'batches._id': item.batch._id },
      { $inc: { 'batches.$[batch].quantity': item.quantity } },
      { arrayFilters: [{ 'batch._id': item.batch._id }] }
    )));
    throw error;
  }

  const movements = await StockMovement.insertMany(completed.map(item => ({
    companyId: visit.companyId,
    branchId: visit.branchId,
    productId: item.product._id,
    batchId: item.batch._id,
    type: 'CONSUMPTION',
    quantity: item.quantity,
    referenceType: 'Visit',
    referenceId: visit._id,
    note: `${visit.visitNo} — ${visit.serviceName}`,
    createdBy: actorId
  })));

  return movements;
}
