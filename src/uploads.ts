import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config';
import { ApiError } from './errors';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

export async function savePhotoDataUrl(dataUrl: string, subdir: 'bikes' | 'users', id: string): Promise<string> {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw ApiError.badRequest('That photo could not be read. Try a different image.', 'photoDataUrl');
  const [, mime, base64] = match;
  const extension = EXTENSION_BY_MIME[mime.toLowerCase()];
  if (!extension) throw ApiError.badRequest('Photos must be PNG, JPEG or WebP.', 'photoDataUrl');

  const dir = path.join(process.cwd(), config.uploadsDir, subdir);
  await mkdir(dir, { recursive: true });
  const filename = `${id}-${randomUUID().slice(0, 8)}.${extension}`;
  await writeFile(path.join(dir, filename), Buffer.from(base64, 'base64'));

  return `${config.publicOrigin}${config.publicUploadsPath}/${subdir}/${filename}`;
}
