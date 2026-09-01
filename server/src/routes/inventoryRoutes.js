import { Router } from 'express';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES, STAFF_ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeBranch } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
import { stockAfterMovement } from '../utils/inventory.js';
import { StockAdjustment } from '../models/StockAdjustment.js';
import { StockTransfer } from '../models/StockTransfer.js';
import { Branch } from '../models/Branch.js';
const r = Router();
r.use(authenticate, allowRoles(...STAFF_ROLES));
r.get(
  '/products',
  asyncHandler(async (req, res) =>
    res.json({
      items: await Product.find(branchScope(req, req.query.branchId)).sort({
        name: 1,
      }),
    }),
  ),
);
r.post(
  '/products',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.STOREKEEPER),
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId),
      product = await Product.create({
        ...req.body,
        companyId: req.auth.companyId,
        branchId,
        createdBy: req.auth.userId,
        updatedBy: req.auth.userId,
      });
    res.status(201).json({ product });
  }),
);
r.post(
  '/movements',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.STOREKEEPER),
  asyncHandler(async (req, res) => {
    if (['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].includes(req.body.type))
      throw new AppError(
        422,
        'Stock adjustments must use the approval workflow',
      );
    const product = await Product.findOne({
      ...branchScope(req),
      _id: req.body.productId,
    });
    if (!product) throw new AppError(404, 'Product not found');
    const batch = product.batches.id(req.body.batchId);
    if (!batch) throw new AppError(404, 'Batch not found');
    const { quantity, newQuantity } = stockAfterMovement(
      batch.quantity,
      req.body.quantity,
      req.body.type,
    );
    batch.quantity = newQuantity;
    product.updatedBy = req.auth.userId;
    await product.save();
    const movement = await StockMovement.create({
      ...req.body,
      quantity,
      companyId: product.companyId,
      branchId: product.branchId,
      createdBy: req.auth.userId,
    });
    res.status(201).json({ movement, product });
  }),
);
r.get(
  '/movements',
  asyncHandler(async (req, res) =>
    res.json({
      items: await StockMovement.find(branchScope(req, req.query.branchId))
        .populate('productId', 'name sku unit')
        .sort({ occurredAt: -1 })
        .limit(200),
    }),
  ),
);
r.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const products = await Product.find(branchScope(req, req.query.branchId));
    const expiryLimit = new Date();
    expiryLimit.setDate(expiryLimit.getDate() + 60);
    const lowStock = [];
    const expiring = [];
    for (const product of products) {
      const total = product.batches.reduce((sum, batch) => sum + batch.quantity, 0);
      if (total <= product.reorderLevel)
        lowStock.push({ productId: product._id, sku: product.sku, name: product.name, total, reorderLevel: product.reorderLevel, unit: product.unit });
      for (const batch of product.batches)
        if (batch.quantity > 0 && batch.expiryDate && batch.expiryDate <= expiryLimit)
          expiring.push({ productId: product._id, name: product.name, batchId: batch._id, batchNo: batch.batchNo, expiryDate: batch.expiryDate, quantity: batch.quantity, unit: product.unit, expired: batch.expiryDate < new Date() });
    }
    res.json({ lowStock, expiring });
  }),
);
r.post(
  '/transfers',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.STOREKEEPER),
  asyncHandler(async (req, res) => {
    const source = await Product.findOne({ ...branchScope(req), _id: req.body.productId });
    if (!source) throw new AppError(404, 'Source product not found');
    const destinationBranch = await Branch.findOne({
      _id: req.body.toBranchId,
      companyId: req.auth.companyId,
      active: true,
    });
    if (!destinationBranch) throw new AppError(422, 'Select an active destination branch');
    if (String(destinationBranch._id) === String(source.branchId))
      throw new AppError(422, 'Destination branch must be different');
    const sourceBatch = source.batches.id(req.body.batchId);
    if (!sourceBatch) throw new AppError(404, 'Source batch not found');
    const { quantity, newQuantity } = stockAfterMovement(
      sourceBatch.quantity,
      req.body.quantity,
      'TRANSFER_OUT',
    );
    let destination = await Product.findOne({
      companyId: source.companyId,
      branchId: destinationBranch._id,
      sku: source.sku,
    });
    if (!destination)
      destination = await Product.create({
        companyId: source.companyId,
        branchId: destinationBranch._id,
        sku: source.sku,
        name: source.name,
        category: source.category,
        brand: source.brand,
        unit: source.unit,
        hsnSac: source.hsnSac,
        reorderLevel: source.reorderLevel,
        batches: [],
        createdBy: req.auth.userId,
        updatedBy: req.auth.userId,
      });
    let destinationBatch = destination.batches.find(
      (batch) => batch.batchNo === sourceBatch.batchNo,
    );
    if (!destinationBatch) {
      destination.batches.push({
        batchNo: sourceBatch.batchNo,
        expiryDate: sourceBatch.expiryDate,
        quantity: 0,
        purchaseRate: sourceBatch.purchaseRate,
      });
      destinationBatch = destination.batches.at(-1);
    }
    sourceBatch.quantity = newQuantity;
    source.updatedBy = req.auth.userId;
    destinationBatch.quantity += quantity;
    destination.updatedBy = req.auth.userId;
    await source.save();
    try {
      await destination.save();
    } catch (error) {
      sourceBatch.quantity += quantity;
      await source.save();
      throw error;
    }
    const transfer = await StockTransfer.create({
      companyId: source.companyId,
      fromBranchId: source.branchId,
      toBranchId: destination.branchId,
      sourceProductId: source._id,
      destinationProductId: destination._id,
      batchNo: sourceBatch.batchNo,
      quantity,
      note: req.body.note,
      transferredBy: req.auth.userId,
    });
    await StockMovement.insertMany([
      { companyId: source.companyId, branchId: source.branchId, productId: source._id, batchId: sourceBatch._id, type: 'TRANSFER_OUT', quantity, referenceType: 'StockTransfer', referenceId: transfer._id, note: req.body.note, createdBy: req.auth.userId },
      { companyId: destination.companyId, branchId: destination.branchId, productId: destination._id, batchId: destinationBatch._id, type: 'TRANSFER_IN', quantity, referenceType: 'StockTransfer', referenceId: transfer._id, note: req.body.note, createdBy: req.auth.userId },
    ]);
    res.status(201).json({ transfer });
  }),
);
r.get(
  '/adjustments',
  asyncHandler(async (req, res) => {
    const items = await StockAdjustment.find(branchScope(req, req.query.branchId))
      .populate('productId', 'name sku unit')
      .populate('requestedBy reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ items });
  }),
);
r.post(
  '/adjustments',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.STOREKEEPER),
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ ...branchScope(req), _id: req.body.productId });
    const batch = product?.batches.id(req.body.batchId);
    if (!product || !batch) throw new AppError(404, 'Product batch not found');
    const quantity = Number(req.body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0)
      throw new AppError(422, 'Adjustment quantity must be greater than zero');
    if (!['IN', 'OUT'].includes(req.body.direction))
      throw new AppError(422, 'Select a valid adjustment direction');
    if (!String(req.body.reason || '').trim())
      throw new AppError(422, 'Adjustment reason is required');
    const adjustment = await StockAdjustment.create({
      companyId: product.companyId,
      branchId: product.branchId,
      productId: product._id,
      batchId: batch._id,
      direction: req.body.direction,
      quantity,
      reason: req.body.reason.trim(),
      requestedBy: req.auth.userId,
    });
    res.status(201).json({ adjustment });
  }),
);
r.patch(
  '/adjustments/:id/review',
  allowRoles(ROLES.OWNER, ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const adjustment = await StockAdjustment.findOne({
      ...branchScope(req),
      _id: req.params.id,
      status: 'Pending',
    });
    if (!adjustment) throw new AppError(404, 'Pending adjustment not found');
    if (!['Approved', 'Rejected'].includes(req.body.status))
      throw new AppError(422, 'Review must be Approved or Rejected');
    if (req.body.status === 'Approved') {
      const product = await Product.findOne({ _id: adjustment.productId, companyId: adjustment.companyId, branchId: adjustment.branchId });
      const batch = product?.batches.id(adjustment.batchId);
      if (!product || !batch) throw new AppError(404, 'Product batch not found');
      const type = adjustment.direction === 'OUT' ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN';
      const result = stockAfterMovement(batch.quantity, adjustment.quantity, type);
      batch.quantity = result.newQuantity;
      product.updatedBy = req.auth.userId;
      await product.save();
      await StockMovement.create({
        companyId: product.companyId,
        branchId: product.branchId,
        productId: product._id,
        batchId: batch._id,
        type,
        quantity: result.quantity,
        referenceType: 'StockAdjustment',
        referenceId: adjustment._id,
        note: adjustment.reason,
        createdBy: req.auth.userId,
      });
    }
    adjustment.status = req.body.status;
    adjustment.reviewedBy = req.auth.userId;
    adjustment.reviewedAt = new Date();
    adjustment.reviewNote = req.body.reviewNote;
    await adjustment.save();
    res.json({ adjustment });
  }),
);
export default r;
