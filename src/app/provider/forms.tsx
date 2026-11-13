"use client";

import { useActionState } from "react";
import { createOffer, registerProvider, type FormState } from "./actions";
import { DISTRICTS, PROVIDER_TYPE_LABEL, SERVICE_LABEL } from "@/lib/labels";

function Msg({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="font-semibold text-bad">{state.error}</p>;
  if (state.ok) return <p role="status" className="font-semibold text-ok">Сохранено. Ждёт проверки администратором.</p>;
  return null;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

export function RegisterForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(registerProvider, {});
  return (
    <form action={action} className="space-y-3">
      {demo && <p className="text-sm text-warn">Демо: используйте вымышленные данные.</p>}
      <Field id="type" label="Кто вы">
        <select id="type" name="type" className="field" required>
          {Object.entries(PROVIDER_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <Field id="title" label="Название"><input id="title" name="title" className="field" required minLength={3} maxLength={120} /></Field>
      <Field id="description" label="О вас">
        <textarea id="description" name="description" rows={3} maxLength={1500} className="field" />
      </Field>
      <Field id="district" label="Округ">
        <select id="district" name="district" className="field" required>
          {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        </select>
      </Field>
      <Field id="metro" label="Метро (по желанию)"><input id="metro" name="metro" className="field" maxLength={60} /></Field>
      <Field id="address" label="Адрес"><input id="address" name="address" className="field" required minLength={5} maxLength={200} /></Field>
      <Field id="contact" label="Контакт для связи (телефон или почта)">
        <input id="contact" name="contact" className="field" required minLength={5} maxLength={200} />
      </Field>
      <Msg state={state} />
      <button className="btn" disabled={pending}>Отправить на проверку</button>
    </form>
  );
}

export function OfferForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createOffer, {});
  return (
    <form action={action} className="space-y-3">
      <Field id="service" label="Услуга">
        <select id="service" name="service" className="field" required>
          {Object.entries(SERVICE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <Field id="otitle" label="Название предложения">
        <input id="otitle" name="title" className="field" required minLength={5} maxLength={120} />
      </Field>
      <Field id="odesc" label="Описание: что делаем, сколько длится, что нужно от модели">
        <textarea id="odesc" name="description" rows={3} maxLength={1500} className="field" />
      </Field>
      <Field id="priceMode" label="Стоимость для модели">
        <select id="priceMode" name="priceMode" className="field">
          <option value="FREE">Полностью бесплатно</option>
          <option value="MATERIALS_ONLY">Только материалы</option>
        </select>
      </Field>
      <Field id="materialsFrom" label="Материалы, от ₽ (только если выбрано «Только материалы»)">
        <input id="materialsFrom" name="materialsFrom" inputMode="numeric" className="field" placeholder="1200" />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Даты (московское время), до 5 штук</legend>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="grid grid-cols-[1fr_5rem] gap-2">
            <input name={`slot${i}`} type="datetime-local" className="field" aria-label={`Дата ${i + 1}`} />
            <input name={`seats${i}`} type="number" min={1} max={20} defaultValue={1} className="field" aria-label={`Мест на дату ${i + 1}`} />
          </div>
        ))}
        <p className="text-xs text-muted">Справа число мест на дату.</p>
      </fieldset>
      <Msg state={state} />
      <button className="btn" disabled={pending}>Отправить на проверку</button>
    </form>
  );
}
