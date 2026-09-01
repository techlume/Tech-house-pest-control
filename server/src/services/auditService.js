import { AuditLog } from '../models/AuditLog.js';
export const audit=(req,action,entityType,entityId,metadata={})=>AuditLog.create({companyId:req.auth?.companyId,branchId:req.auth?.branchId,actorId:req.auth?.userId,action,entityType,entityId,ip:req.ip,userAgent:req.get('user-agent'),metadata});
