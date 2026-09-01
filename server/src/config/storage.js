import path from 'node:path';
export const storage = Object.freeze({
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'storage/uploads'),
  maxBytes: Math.max(Number(process.env.MAX_UPLOAD_BYTES) || 700000, 100000),
});
