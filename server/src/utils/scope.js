import { AppError } from './AppError.js';
export function writeBranch(req,requested){const id=req.auth.allBranches?requested:req.auth.branchId;if(!id)throw new AppError(422,'A branch is required','BRANCH_REQUIRED');return id}
export const pagination=(query)=>{const page=Math.max(Number(query.page)||1,1);const limit=Math.min(Math.max(Number(query.limit)||20,1),100);return{page,limit,skip:(page-1)*limit}};
