import { Router } from 'express';
import { Lead } from '../models/Lead.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeBranch } from '../utils/scope.js';
import { nextReference } from '../services/sequenceService.js';
import { AppError } from '../utils/AppError.js';
const router = Router();
router.use(authenticate, allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.SALESPERSON, ROLES.STOREKEEPER));
const permissions = {
  leads: [ROLES.OWNER, ROLES.ADMIN, ROLES.SALESPERSON],
  customers: [ROLES.OWNER, ROLES.ADMIN, ROLES.SALESPERSON],
  products: [ROLES.OWNER, ROLES.ADMIN, ROLES.STOREKEEPER],
};
const ensurePermission = (req, entity) => {
  if (!permissions[entity]?.includes(req.auth.role))
    throw new AppError(403, 'You do not have permission for this bulk operation');
};
router.get('/export/:entity', asyncHandler(async (req, res) => {
  const entity = req.params.entity;
  ensurePermission(req, entity);
  const scope = branchScope(req, req.query.branchId);
  let rows;
  if (entity === 'leads')
    rows = (await Lead.find(scope).lean()).map((item) => ({ leadNo: item.leadNo, name: item.name, phone: item.phone, email: item.email, source: item.source, propertyType: item.propertyType, pestTypes: item.pestTypes?.join('|'), address: item.address, city: item.city, priority: item.priority, status: item.status }));
  if (entity === 'customers')
    rows = (await Customer.find(scope).lean()).map((item) => ({ customerNo: item.customerNo, name: item.name, phone: item.phone, email: item.email, customerType: item.customerType, gstin: item.gstin, siteName: item.properties?.[0]?.name, address: item.properties?.[0]?.address?.line1, city: item.properties?.[0]?.address?.city, state: item.properties?.[0]?.address?.state, pin: item.properties?.[0]?.address?.pin, active: item.active }));
  if (entity === 'products')
    rows = (await Product.find(scope).lean()).flatMap((item) => item.batches.map((batch) => ({ sku: item.sku, name: item.name, category: item.category, brand: item.brand, unit: item.unit, hsnSac: item.hsnSac, reorderLevel: item.reorderLevel, batchNo: batch.batchNo, expiryDate: batch.expiryDate?.toISOString().slice(0, 10), quantity: batch.quantity, purchaseRate: batch.purchaseRate, active: item.active })));
  res.json({ rows: rows || [] });
}));
router.post('/import/:entity', asyncHandler(async (req, res) => {
  const entity = req.params.entity;
  ensurePermission(req, entity);
  if (!Array.isArray(req.body.rows) || !req.body.rows.length)
    throw new AppError(422, 'Import file contains no rows');
  if (req.body.rows.length > 500)
    throw new AppError(422, 'A single import is limited to 500 rows');
  const branchId = writeBranch(req, req.body.branchId);
  const scope = { companyId: req.auth.companyId, branchId };
  const results = [];
  for (let index = 0; index < req.body.rows.length; index += 1) {
    const row = req.body.rows[index];
    try {
      if (!row.name) throw new AppError(422, 'Name is required');
      if (entity === 'leads') {
        if (!row.phone) throw new AppError(422, 'Phone is required');
        await Lead.create({ ...scope, name: row.name, phone: row.phone, email: row.email, source: row.source || 'Other', propertyType: row.propertyType || 'Residential', pestTypes: String(row.pestTypes || '').split('|').filter(Boolean), address: row.address, city: row.city, priority: row.priority || 'Normal', status: 'New', leadNo: await nextReference(Lead, scope, 'leadNo', 'LEAD'), createdBy: req.auth.userId, updatedBy: req.auth.userId, activities: [{ type: 'CREATED', note: 'Bulk imported', createdBy: req.auth.userId }] });
      } else if (entity === 'customers') {
        if (!row.phone || !row.address || !row.city) throw new AppError(422, 'Phone, address and city are required');
        await Customer.create({ ...scope, name: row.name, phone: row.phone, email: row.email, customerType: row.customerType || 'Residential', gstin: row.gstin, properties: [{ name: row.siteName || 'Primary Site', propertyType: row.customerType || 'Residential', address: { line1: row.address, city: row.city, state: row.state || 'Tamil Nadu', pin: row.pin } }], customerNo: await nextReference(Customer, scope, 'customerNo', 'CUS'), createdBy: req.auth.userId, updatedBy: req.auth.userId });
      } else if (entity === 'products') {
        if (!row.sku || !row.unit || !row.batchNo) throw new AppError(422, 'SKU, unit and batch number are required');
        const existing = await Product.findOne({ ...scope, sku: row.sku });
        if (existing) {
          if (existing.batches.some((batch) => batch.batchNo === row.batchNo))
            throw new AppError(409, 'SKU and batch number already exist in this branch');
          existing.batches.push({ batchNo: row.batchNo, expiryDate: row.expiryDate || undefined, quantity: Number(row.quantity || 0), purchaseRate: Number(row.purchaseRate || 0) });
          existing.updatedBy = req.auth.userId;
          await existing.save();
        } else
          await Product.create({ ...scope, sku: row.sku, name: row.name, category: row.category, brand: row.brand, unit: row.unit, hsnSac: row.hsnSac, reorderLevel: Number(row.reorderLevel || 0), batches: [{ batchNo: row.batchNo, expiryDate: row.expiryDate || undefined, quantity: Number(row.quantity || 0), purchaseRate: Number(row.purchaseRate || 0) }], createdBy: req.auth.userId, updatedBy: req.auth.userId });
      }
      results.push({ row: index + 2, success: true });
    } catch (error) {
      results.push({ row: index + 2, success: false, message: error.message });
    }
  }
  res.status(207).json({ imported: results.filter((item) => item.success).length, failed: results.filter((item) => !item.success).length, results });
}));
export default router;
