import { Router } from 'express';
import { Supplier } from '../models/Supplier.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { Expense } from '../models/Expense.js';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeBranch } from '../utils/scope.js';
import { nextReference } from '../services/sequenceService.js';
import { AppError } from '../utils/AppError.js';
const router = Router();
const staff = allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.STOREKEEPER);
router.use(authenticate, staff);
router.get('/suppliers', asyncHandler(async (req, res) => res.json({ items: await Supplier.find(branchScope(req, req.query.branchId)).sort({ name: 1 }) })));
router.post('/suppliers', allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.ACCOUNTANT, ROLES.STOREKEEPER), asyncHandler(async (req, res) => {
  const branchId = writeBranch(req, req.body.branchId), scope = { companyId: req.auth.companyId, branchId };
  const supplier = await Supplier.create({ ...req.body, ...scope, supplierNo: await nextReference(Supplier, scope, 'supplierNo', 'SUP'), createdBy: req.auth.userId, updatedBy: req.auth.userId });
  res.status(201).json({ supplier });
}));
router.get('/purchases', asyncHandler(async (req, res) => res.json({ items: await PurchaseOrder.find(branchScope(req, req.query.branchId)).populate('supplierId', 'name supplierNo').populate('lines.productId', 'name sku unit').sort({ orderDate: -1 }) })));
router.post('/purchases', asyncHandler(async (req, res) => {
  const branchId = writeBranch(req, req.body.branchId), scope = { companyId: req.auth.companyId, branchId };
  const supplier = await Supplier.findOne({ _id: req.body.supplierId, ...scope, active: true });
  if (!supplier) throw new AppError(422, 'Select an active supplier');
  if (!Array.isArray(req.body.lines) || !req.body.lines.length) throw new AppError(422, 'At least one purchase line is required');
  let subtotal = 0, taxTotal = 0;
  const lines = [];
  for (const item of req.body.lines) {
    const product = await Product.findOne({ _id: item.productId, ...scope, active: true });
    if (!product) throw new AppError(422, 'Select products from the purchase branch');
    const quantity = Number(item.quantity), rate = Number(item.rate), taxRate = Number(item.taxRate || 0);
    if (!(quantity > 0) || !(rate >= 0) || taxRate < 0 || taxRate > 100) throw new AppError(422, 'Enter valid purchase quantity, rate and tax');
    const base = quantity * rate, tax = (base * taxRate) / 100;
    subtotal += base; taxTotal += tax;
    lines.push({ ...item, quantity, rate, taxRate, total: base + tax });
  }
  const purchase = await PurchaseOrder.create({ ...req.body, ...scope, lines, subtotal, taxTotal, grandTotal: subtotal + taxTotal, purchaseNo: await nextReference(PurchaseOrder, scope, 'purchaseNo', 'PO'), status: 'Draft', createdBy: req.auth.userId, updatedBy: req.auth.userId });
  res.status(201).json({ purchase });
}));
router.patch('/purchases/:id/approve', allowRoles(ROLES.OWNER, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const purchase = await PurchaseOrder.findOne({ ...branchScope(req), _id: req.params.id, status: 'Draft' });
  if (!purchase) throw new AppError(404, 'Draft purchase order not found');
  purchase.status = 'Approved'; purchase.approvedBy = req.auth.userId; purchase.approvedAt = new Date(); purchase.updatedBy = req.auth.userId;
  await purchase.save(); res.json({ purchase });
}));
router.post('/purchases/:id/receive', allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.STOREKEEPER), asyncHandler(async (req, res) => {
  const purchase = await PurchaseOrder.findOne({ ...branchScope(req), _id: req.params.id, status: 'Approved' });
  if (!purchase) throw new AppError(404, 'Approved purchase order not found');
  const movements = [];
  for (const line of purchase.lines) {
    const product = await Product.findOne({ _id: line.productId, companyId: purchase.companyId, branchId: purchase.branchId });
    if (!product) throw new AppError(409, 'A purchase product is no longer available');
    let batch = product.batches.find((item) => item.batchNo === line.batchNo);
    if (!batch) { product.batches.push({ batchNo: line.batchNo, expiryDate: line.expiryDate, quantity: 0, purchaseRate: line.rate }); batch = product.batches.at(-1); }
    batch.quantity += line.quantity; line.receivedQuantity = line.quantity; product.updatedBy = req.auth.userId; await product.save();
    movements.push({ companyId: purchase.companyId, branchId: purchase.branchId, productId: product._id, batchId: batch._id, type: 'PURCHASE', quantity: line.quantity, referenceType: 'PurchaseOrder', referenceId: purchase._id, note: purchase.purchaseNo, createdBy: req.auth.userId });
  }
  await StockMovement.insertMany(movements);
  purchase.status = 'Received'; purchase.receivedBy = req.auth.userId; purchase.receivedAt = new Date(); purchase.updatedBy = req.auth.userId; await purchase.save();
  res.json({ purchase });
}));
router.get('/expenses', asyncHandler(async (req, res) => res.json({ items: await Expense.find(branchScope(req, req.query.branchId)).sort({ date: -1 }).limit(500) })));
router.post('/expenses', allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.ACCOUNTANT), asyncHandler(async (req, res) => {
  const branchId = writeBranch(req, req.body.branchId), scope = { companyId: req.auth.companyId, branchId }, amount = Number(req.body.amount), taxAmount = Number(req.body.taxAmount || 0);
  if (!(amount > 0) || taxAmount < 0 || taxAmount > amount) throw new AppError(422, 'Enter a valid expense and tax amount');
  const expense = await Expense.create({ ...req.body, ...scope, amount, taxAmount, expenseNo: await nextReference(Expense, scope, 'expenseNo', 'EXP'), createdBy: req.auth.userId });
  res.status(201).json({ expense });
}));
router.patch('/expenses/:id/approve', allowRoles(ROLES.OWNER, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ ...branchScope(req), _id: req.params.id, status: 'Recorded' });
  if (!expense) throw new AppError(404, 'Recorded expense not found');
  expense.status = 'Approved'; expense.approvedBy = req.auth.userId; await expense.save(); res.json({ expense });
}));
export default router;
