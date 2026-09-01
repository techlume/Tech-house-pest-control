import { AppError } from './AppError.js';
export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
export function assertStrongPassword(password) {
  if (!PASSWORD_PATTERN.test(String(password || '')))
    throw new AppError(
      422,
      'Password must be 8-64 characters and include uppercase, lowercase, number and special character',
      'WEAK_PASSWORD',
    );
}
