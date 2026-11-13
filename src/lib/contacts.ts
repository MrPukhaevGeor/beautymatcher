// Приведение почты и телефона к единому виду.

export function normalizeEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254 ? v : null;
}

/** Российский номер → +7XXXXXXXXXX. Всё остальное отвергается. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) return `+7${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `+7${digits}`;
  return null;
}
