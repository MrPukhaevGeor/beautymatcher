"use client";

import Link from "next/link";
import { useActionState } from "react";
import { apply, type ApplyState } from "./actions";
import { formatSlot } from "@/lib/labels";

type Slot = { id: string; startsAt: string; free: number };

export function ApplyForm({ slots, demo, role }: { slots: Slot[]; demo: boolean; role: string | null }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(apply, {});

  if (!role) {
    return (
      <p>
        <Link href="/login" className="btn no-underline">Войдите, чтобы подать заявку</Link>
      </p>
    );
  }
  if (role !== "MODEL") return <p className="text-sm text-muted">Заявки подают только модели.</p>;
  if (state.ok) {
    return (
      <p role="status" className="rounded-xl bg-ok-soft p-3 font-semibold text-ok">
        Заявка отправлена. Ответ придёт на почту, статус виден в <Link href="/cabinet">кабинете</Link>.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="font-semibold">Выберите дату</legend>
        {slots.map((s) => (
          <label key={s.id} className={`flex items-center gap-3 rounded-xl border border-line p-3 ${s.free === 0 ? "opacity-60" : ""}`}>
            <input type="radio" name="slotId" value={s.id} required disabled={s.free === 0} />
            <span className="flex-1">{formatSlot(new Date(s.startsAt))}</span>
            <span className={`chip ${s.free === 0 ? "chip-bad" : ""}`}>{s.free === 0 ? "Мест нет" : `Мест: ${s.free}`}</span>
          </label>
        ))}
      </fieldset>

      <div>
        <label htmlFor="comment" className="mb-1 block font-semibold">Комментарий</label>
        <textarea id="comment" name="comment" rows={3} maxLength={1000} className="field"
          placeholder="Длина и состояние волос, пожелания" />
        {demo && <p className="mt-1 text-sm text-warn">Демо: не вводите реальные данные.</p>}
      </div>

      <div>
        <label htmlFor="photo" className="mb-1 block font-semibold">Фото волос (по желанию)</label>
        {demo ? (
          <p className="text-sm text-muted">В демо-версии загрузка фото отключена.</p>
        ) : (
          <>
            <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="field" />
            <p className="mt-1 text-sm text-muted">Снимайте волосы, а не лицо. Фото увидят только школа или мастер.</p>
          </>
        )}
      </div>

      <label className="flex items-start gap-2">
        <input type="checkbox" name="age" required className="mt-1" />
        <span>Мне исполнилось 18 лет</span>
      </label>

      {state.error && <p role="alert" className="font-semibold text-bad">{state.error}</p>}
      <button className="btn w-full sm:w-auto" disabled={pending}>Отправить заявку</button>
    </form>
  );
}
