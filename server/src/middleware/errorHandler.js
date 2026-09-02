import { AppError } from '../utils/AppError.js';

export const notFound = (req, _res, next) =>
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND'));

export function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message;

  // Handle MongoDB Duplicate Key Error (E11000)
  if (error.code === 11000 || error.code === '11000') {
    status = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'record';
    const val = error.keyValue ? error.keyValue[field] : '';
    message = `A user or record with this ${field}${val ? ` "${val}"` : ''} already exists.`;
  } else if (error.name === 'ValidationError') {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = Object.values(error.errors || {})
      .map((e) => e.message)
      .join(', ');
  }

  if (status >= 500) {
    console.error(error);
    message = 'An unexpected error occurred';
  }

  res.status(status).json({
    error: {
      code,
      message,
      details: error.details,
    },
  });
}
