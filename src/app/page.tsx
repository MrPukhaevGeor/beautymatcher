import Link from "next/link";
import { SEO_PAGES } from "@/lib/seo-pages";

const STEPS = [
  { n: "1", t: "Выберите предложение", d: "В каталоге есть стрижки, окрашивание, маникюр и другие услуги. У каждого предложения видно, бесплатно оно полностью или нужно оплатить материалы." },
  { n: "2", t: "Отправьте заявку", d: "Выберите дату, напишите о ваших волосах или коже, при желании приложите фото. Нужно подтвердить, что вам исполнилось 18 лет." },
  { n: "3", t: "Получите ответ", d: "Школа или мастер подтвердит заявку и вы увидите адрес. После визита можно оставить отзыв." },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="space-y-4 py-4">
        <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
          Бесплатные стрижки, окрашивание и маникюр в Москве
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Школы и мастера бьюти-индустрии ищут моделей для практики. Вы получаете услугу бесплатно или только за материалы, они получают опыт. «Красота рядом» помогает вам найти друг друга.
        </p>
        <p className="flex flex-wrap gap-3">
          <Link href="/offers" className="btn no-underline">Найти предложение</Link>
          <Link href="/for-providers" className="btn btn-ghost no-underline">Я школа или мастер</Link>
        </p>
      </section>

      <section aria-labelledby="how" className="space-y-4">
        <h2 id="how" className="text-2xl font-bold">Как это работает</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card space-y-2">
              <span className="chip" aria-hidden="true">Шаг {s.n}</span>
              <h3 className="font-bold">{s.t}</h3>
              <p className="text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="honest" className="card space-y-2">
        <h2 id="honest" className="text-xl font-bold">Что важно знать</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Это практика: результат может отличаться от ожиданий. Обсуждайте пожелания заранее.</li>
          <li>«Бесплатно» не всегда значит «ничего не платите»: иногда просят оплатить материалы. Сумма указана в предложении.</li>
          <li>Исполнителя можно выбрать по типу: школа, колледж, салон или частный мастер.</li>
        </ul>
      </section>

      <section aria-labelledby="services" className="space-y-3">
        <h2 id="services" className="text-2xl font-bold">Что можно найти</h2>
        <ul className="flex flex-wrap gap-2">
          {SEO_PAGES.map((p) => (
            <li key={p.slug}>
              <Link href={`/free/${p.slug}`} className="chip no-underline">{p.h1.replace(" в Москве", "")}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
