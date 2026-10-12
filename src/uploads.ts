import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config';
import { query } from './db';
import { ApiError } from './errors';

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function matchesMime(mime: string, bytes: Buffer): boolean {
  if (mime === 'image/jpeg') return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => bytes[i] === byte);
  }
  if (mime === 'image/webp') {
    return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

function decodePhotoDataUrl(dataUrl: unknown): { mime: string; extension: string; bytes: Buffer } {
  if (typeof dataUrl !== 'string') {
    throw new ApiError(400, 'invalid_photo', 'Upload a JPG, PNG or WebP image.', 'photoDataUrl');
  }
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
  if (!match) throw new ApiError(400, 'invalid_photo', 'That photo could not be read. Try a different image.', 'photoDataUrl');

  const mime = match[1].toLowerCase();
  const extension = EXTENSION_BY_MIME[mime];
  if (!extension) throw new ApiError(400, 'invalid_file_type', 'Use a JPG, PNG or WebP image.', 'photoDataUrl');

  const encoded = match[2];
  if (!encoded || encoded.length % 4 !== 0) {
    throw new ApiError(400, 'invalid_photo', 'The image file is empty or invalid.', 'photoDataUrl');
  }
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  if (Math.floor((encoded.length * 3) / 4) - padding > PHOTO_MAX_BYTES) {
    throw new ApiError(400, 'file_too_large', 'The image must be 5 MB or smaller.', 'photoDataUrl');
  }

  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length === 0) throw new ApiError(400, 'invalid_photo', 'The image file is empty or invalid.', 'photoDataUrl');
  if (!matchesMime(mime, bytes)) {
    throw new ApiError(400, 'invalid_file_type', 'The image content must match its JPG, PNG or WebP type.', 'photoDataUrl');
  }
  return { mime, extension, bytes };
}

export async function savePhotoDataUrl(dataUrl: unknown, subdir: 'bikes' | 'users', id: string): Promise<string> {
  const { mime, extension, bytes } = decodePhotoDataUrl(dataUrl);
  const filename = `${id}-${randomUUID()}.${extension}`;

  if (config.photoStorage === 'db') {
    await query('INSERT INTO photo_files (file_path, mime_type, data) VALUES ($1, $2, $3)', [
      `${subdir}/${filename}`,
      mime,
      bytes,
    ]);
  } else {
    const dir = path.join(process.cwd(), config.uploadsDir, subdir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
  }

  return `${config.publicOrigin}${config.publicUploadsPath}/${subdir}/${filename}`;
}