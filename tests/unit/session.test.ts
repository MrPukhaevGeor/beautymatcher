import { beforeAll, describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "@/lib/session";
import { normalizeEmail, normalizePhone } from "@/lib/contacts";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-test-secret";
});

describe("сессия", () => {
  it("возвращает id пользователя из корректного токена", () => {
    expect(decodeSession(encodeSession("u1"))).toBe("u1");
  });

  it("отвергает подделанную подпись и подменённое содержимое", () => {
    const token = encodeSession("u1");
    const [payload, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: Date.now() + 1e9 })).toString("base64url");
    expect(decodeSession(`${payload}.${mac}x`)).toBeNull();
    expect(decodeSession(`${forged}.${mac}`)).toBeNull();
    expect(decodeSession("мусор")).toBeNull();
    expect(decodeSession(undefined)).toBeNull();
  });

  it("отвергает просроченный токен", () => {
    const token = encodeSession("u1", Date.now() - 15 * 24 * 60 * 60 * 1000);
    expect(decodeSession(token)).toBeNull();
  });
});

describe("нормализация контактов", () => {
  it("приводит российские номера к +7XXXXXXXXXX", () => {
    expect(normalizePhone("8 (916) 123-45-67")).toBe("+79161234567");
    expect(normalizePhone("+7 916 123 45 67")).toBe("+79161234567");
    expect(normalizePhone("9161234567")).toBe("+79161234567");
  });

  it("отвергает чужие и неполные номера", () => {
    expect(normalizePhone("+1 202 555 0100")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("проверяет почту и приводит к нижнему регистру", () => {
    expect(normalizeEmail("  Anna@Example.RU ")).toBe("anna@example.ru");
    expect(normalizeEmail("без-собаки")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
  });
});
