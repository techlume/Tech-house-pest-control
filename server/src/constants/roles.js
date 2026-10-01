export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  SUB_ADMIN: 'SUB_ADMIN',
  TECHNICIAN: 'TECHNICIAN',
  AUDITOR: 'AUDITOR',
});
export const ROLE_VALUES = Object.values(ROLES);
export const STAFF_ROLES = ROLE_VALUES;
export const GLOBAL_BRANCH_ROLES = [ROLES.ADMIN];
