import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { DEMO_BANNER, isDemo } from "@/lib/demo";
import { logout } from "@/app/login/actions";

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: "Красота рядом: бесплатные стрижки и окрашивание в Москве", template: "%s | Красота рядом" },
    description:
      "Находите школы и мастеров бьюти-индустрии Москвы, которым нужны модели для практики. Стрижки, окрашивание, маникюр и другое бесплатно или только за материалы.",
    // В демо-режиме поисковикам индексировать сайт нельзя.
    robots: isDemo() ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const demo = isDemo();

  return (
    <html lang="ru">
      <body>
        {demo && (
          <div role="status" className="bg-warn-soft px-4 py-2 text-center text-sm font-semibold text-warn">
            {DEMO_BANNER}
          </div>
        )}
        <header className="border-b border-line bg-card">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-brand-dark no-underline">
              Красота рядом
            </Link>
            <nav aria-label="Основное меню" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
              <Link href="/offers">Каталог</Link>
              <Link href="/for-providers">Школам и мастерам</Link>
              <Link href="/about">О проекте</Link>
              {user ? (
                <>
                  <Link href={homeFor(user.role)}>Кабинет</Link>
                  <form action={logout}>
                    <button className="btn btn-ghost !min-h-9 !px-3 text-sm" type="submit">Выйти</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn !min-h-9 !px-3 text-sm no-underline">Войти</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mt-10 border-t border-line bg-card">
          <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-sm text-muted">
            <p>
              Независимый социальный проект. Не является сервисом Правительства Москвы и не связан с ним.
            </p>
            <p className="flex flex-wrap gap-x-4">
              <Link href="/about">О проекте</Link>
              <Link href="/terms">Условия</Link>
              <Link href="/privacy">Конфиденциальность</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
