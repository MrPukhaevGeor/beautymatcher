import type { Metadata } from "next";
import { DEMO_ACCOUNTS, isDemo } from "@/lib/demo";
import { demoLogin } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход" };

const VK_READY = Boolean(process.env.VK_CLIENT_ID);
const YANDEX_READY = Boolean(process.env.YANDEX_CLIENT_ID);

const ERRORS: Record<string, string> = {
  demo: "В демо-версии вход через соцсети отключён.",
  "not-configured": "Вход через эту соцсеть пока не настроен.",
  state: "Не удалось подтвердить вход. Попробуйте ещё раз.",
  provider: "Соцсеть не ответила. Попробуйте ещё раз позже или войдите по почте.",
  blocked: "Аккаунт заблокирован.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const demo = isDemo();
  const error = ERRORS[(await searchParams).error ?? ""];

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Вход</h1>
      {error && <p role="alert" className="rounded-xl bg-bad-soft p-3 font-semibold text-bad">{error}</p>}

      {demo && (
        <section className="card space-y-3" aria-labelledby="demo-title">
          <h2 id="demo-title" className="font-bold">Демо-вход</h2>
          <p className="text-sm text-muted">Выберите роль, чтобы посмотреть сервис. Аккаунты вымышленные.</p>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <form key={a.key} action={demoLogin}>
                <input type="hidden" name="key" value={a.key} />
                <button className="btn btn-ghost w-full">{a.label}</button>
              </form>
            ))}
          </div>
        </section>
      )}

      <section className="card space-y-3" aria-labelledby="real-title">
        <h2 id="real-title" className="font-bold">Почта или телефон</h2>
        {demo && <p className="text-sm text-muted">В демо-версии эти способы входа отключены.</p>}
        <LoginForm />
      </section>

      <section className="card space-y-2" aria-labelledby="social-title">
        <h2 id="social-title" className="font-bold">Через соцсети</h2>
        <a
          className={`btn btn-ghost w-full no-underline ${VK_READY && !demo ? "" : "pointer-events-none opacity-60"}`}
          href="/api/auth/vk" aria-disabled={!(VK_READY && !demo)}
        >
          Войти через VK
        </a>
        <a
          className={`btn btn-ghost w-full no-underline ${YANDEX_READY && !demo ? "" : "pointer-events-none opacity-60"}`}
          href="/api/auth/yandex" aria-disabled={!(YANDEX_READY && !demo)}
        >
          Войти через Яндекс
        </a>
        {(!VK_READY || !YANDEX_READY || demo) && (
          <p className="text-sm text-muted">
            {demo ? "В демо-версии отключено." : "Вход через соцсети пока не настроен."}
          </p>
        )}
      </section>
    </div>
  );
}
