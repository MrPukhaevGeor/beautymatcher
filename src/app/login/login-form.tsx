"use client";

import { useState, useTransition } from "react";
import { confirmCode, requestCode, type LoginState } from "./actions";

export function LoginForm() {
  const [channel, setChannel] = useState<"EMAIL" | "PHONE">("EMAIL");
  const [state, setState] = useState<LoginState>({ step: "contact" });
  const [pending, start] = useTransition();

  function onRequest(fd: FormData) {
    start(async () => setState(await requestCode(state, fd)));
  }
  function onConfirm(fd: FormData) {
    // При успехе действие делает redirect, и состояние уже не важно.
    start(async () => setState(await confirmCode(state, fd)));
  }

  if (state.step === "code") {
    return (
      <form action={onConfirm} className="space-y-3">
        <p className="text-sm text-muted">Код отправлен на {state.target}.</p>
        <label className="block text-sm font-semibold" htmlFor="code">Код из сообщения</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="field" required />
        {state.error && <p role="alert" className="text-sm font-semibold text-bad">{state.error}</p>}
        <button className="btn w-full" disabled={pending}>Войти</button>
        <button type="button" className="btn btn-ghost w-full" onClick={() => setState({ step: "contact" })}>
          Изменить {channel === "EMAIL" ? "почту" : "номер"}
        </button>
      </form>
    );
  }

  return (
    <form action={onRequest} className="space-y-3">
      <fieldset className="flex gap-2">
        <legend className="sr-only">Способ входа</legend>
        {(["EMAIL", "PHONE"] as const).map((c) => (
          <label key={c} className={`btn btn-ghost flex-1 ${channel === c ? "!bg-brand-soft" : ""}`}>
            <input type="radio" name="channel" value={c} checked={channel === c} onChange={() => setChannel(c)} className="sr-only" />
            {c === "EMAIL" ? "Почта" : "Телефон"}
          </label>
        ))}
      </fieldset>
      <label className="block text-sm font-semibold" htmlFor="target">
        {channel === "EMAIL" ? "Адрес почты" : "Номер телефона"}
      </label>
      <input
        id="target" name="target" className="field" required
        type={channel === "EMAIL" ? "email" : "tel"}
        autoComplete={channel === "EMAIL" ? "email" : "tel"}
        placeholder={channel === "EMAIL" ? "name@example.ru" : "+7 916 123-45-67"}
      />
      {state.error && <p role="alert" className="text-sm font-semibold text-bad">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>Получить код</button>
    </form>
  );
}
