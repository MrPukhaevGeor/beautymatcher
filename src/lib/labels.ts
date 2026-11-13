export const SERVICE_LABEL = {
  HAIRCUT: "Стрижка",
  COLORING: "Окрашивание",
  STYLING: "Укладка",
  MANICURE: "Маникюр",
  PEDICURE: "Педикюр",
  BROWS: "Брови",
  LASHES: "Ресницы",
  MAKEUP: "Макияж",
} as const;

export const PROVIDER_TYPE_LABEL = {
  SCHOOL: "Школа",
  COLLEGE: "Колледж",
  ACADEMY: "Академия",
  SALON: "Салон",
  PRIVATE_MASTER: "Частный мастер",
} as const;

export const DISTRICTS = [
  "Центральный", "Северный", "Северо-Восточный", "Восточный", "Юго-Восточный",
  "Южный", "Юго-Западный", "Западный", "Северо-Западный", "Зеленоградский",
  "Новомосковский", "Троицкий",
] as const;

export function priceLabel(mode: "FREE" | "MATERIALS_ONLY", materialsFrom: number | null): string {
  if (mode === "FREE") return "Полностью бесплатно";
  return materialsFrom ? `Только материалы, от ${materialsFrom} ₽` : "Только материалы";
}

export function isServiceKey(v: string): v is keyof typeof SERVICE_LABEL {
  return v in SERVICE_LABEL;
}
export function isProviderType(v: string): v is keyof typeof PROVIDER_TYPE_LABEL {
  return v in PROVIDER_TYPE_LABEL;
}

const dtf = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow",
});
export function formatSlot(d: Date): string {
  return dtf.format(d);
}
