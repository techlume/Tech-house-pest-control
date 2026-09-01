import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { storage } from '../config/storage.js';
import { StoredFile } from '../models/StoredFile.js';
import { AppError } from '../utils/AppError.js';
const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export async function savePrivateImage(value, context, purpose) {
  if (!value || !value.startsWith('data:')) return { url: value, path: null, id: null };
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match || !types[match[1]]) throw new AppError(422, 'Images must be JPEG, PNG or WebP');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > storage.maxBytes)
    throw new AppError(422, 'Image exceeds the configured upload limit');
  await mkdir(storage.uploadDir, { recursive: true });
  const filename = randomUUID() + '.' + types[match[1]];
  const filePath = path.join(storage.uploadDir, filename);
  await writeFile(filePath, buffer, { flag: 'wx' });
  try {
    const record = await StoredFile.create({
      ...context,
      filename,
      originalType: match[1],
      size: buffer.length,
      purpose,
    });
    return { url: '/api/v1/media/' + record._id, path: filePath, id: record._id };
  } catch (error) {
    await unlink(filePath).catch(() => {});
    throw error;
  }
}
export async function removeStoredFiles(files) {
  await Promise.all(files.map(async (file) => {
    if (file.path) await unlink(file.path).catch(() => {});
    if (file.id) await StoredFile.deleteOne({ _id: file.id });
  }));
}
export async function persistJobMedia(body, context) {
  const files = [];
  try {
    const evidence = [];
    for (const item of body.evidence || []) {
      const stored = await savePrivateImage(item.url, context, item.type);
      files.push(stored);
      evidence.push({ ...item, url: stored.url });
    }
    const signature = await savePrivateImage(body.customerSignatureUrl, context, 'Customer Signature');
    files.push(signature);
    return { body: { ...body, evidence, customerSignatureUrl: signature.url || undefined }, files };
  } catch (error) {
    await removeStoredFiles(files);
    throw error;
  }
}
