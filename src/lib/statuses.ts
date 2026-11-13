// Чистые правила переходов статусов заявки. Без обращения к базе, поэтому легко тестируются.

export type Status =
  | "PENDING"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED"
  | "ATTENDED"
  | "NO_SHOW";

export type Actor = "MODEL" | "PROVIDER";

const TRANSITIONS: Record<Status, Partial<Record<Status, Actor[]>>> = {
  PENDING: {
    CONFIRMED: ["PROVIDER"],
    DECLINED: ["PROVIDER"],
    CANCELLED: ["MODEL", "PROVIDER"],
  },
  CONFIRMED: {
    ATTENDED: ["PROVIDER"],
    NO_SHOW: ["PROVIDER"],
    CANCELLED: ["MODEL", "PROVIDER"],
  },
  DECLINED: {},
  CANCELLED: {},
  ATTENDED: {},
  NO_SHOW: {},
};

export function canTransition(from: Status, to: Status, actor: Actor): boolean {
  return TRANSITIONS[from][to]?.includes(actor) ?? false;
}

// Статусы, которые занимают место на дату.
export const OCCUPYING: Status[] = ["CONFIRMED", "ATTENDED", "NO_SHOW"];

export const STATUS_LABEL: Record<Status, string> = {
  PENDING: "На рассмотрении",
  CONFIRMED: "Подтверждена",
  DECLINED: "Отклонена",
  CANCELLED: "Отменена",
  ATTENDED: "Пришла",
  NO_SHOW: "Не пришла",
};
