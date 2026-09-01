import jwt from 'jsonwebtoken';import { env } from '../config/env.js';
export const createAccessToken=(u)=>jwt.sign({sub:u.id,companyId:u.companyId.toString(),branchId:u.branchId?.toString()||null,role:u.role},env.JWT_ACCESS_SECRET,{expiresIn:env.ACCESS_TOKEN_TTL});
export const createRefreshToken=(u)=>jwt.sign({sub:u.id,version:u.tokenVersion,type:'refresh'},env.JWT_REFRESH_SECRET,{expiresIn:env.REFRESH_TOKEN_TTL});
export const verifyAccessToken=(t)=>jwt.verify(t,env.JWT_ACCESS_SECRET);export const verifyRefreshToken=(t)=>jwt.verify(t,env.JWT_REFRESH_SECRET);
