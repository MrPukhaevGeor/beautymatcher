import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "uploads", "applications");
const MAX_BYTES = 8 * 1024 * 1024;

export class PhotoError extends Error {}

/**
 * Сжимает фото и убирает служебные данные снимка (геолокацию, модель камеры).
 * sharp по умолчанию не переносит метаданные в результат; .rotate() применяет ориентацию до этого.
 */
export async function savePhoto(file: File): Promise<string> {
  if (file.size === 0) throw new PhotoError("Файл пустой");
  if (file.size > MAX_BYTES) throw new PhotoError("Фото больше 8 МБ");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new PhotoError("Подходит JPEG, PNG или WebP");
  }
  let out: Buffer;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
  } catch {
    throw new PhotoError("Не удалось прочитать изображение");
  }
  await mkdir(DIR, { recursive: true });
  const name = `${randomUUID()}.jpg`;
  await writeFile(path.join(DIR, name), out);
  return name;
}

export async function readPhoto(name: string): Promise<Buffer | null> {
  if (!/^[0-9a-f-]{36}\.jpg$/.test(name)) return null;
  try {
    return await readFile(path.join(DIR, name));
  } catch {
    return null;
  }
}
