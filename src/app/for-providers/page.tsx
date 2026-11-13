import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Школам и мастерам: найдите моделей для практики",
  description: "Бесплатно размещайте предложения для моделей: стрижки, окрашивание, маникюр и другие услуги. Принимайте заявки и подтверждайте их в кабинете.",
};

export default function ForProviders() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Модели для практики в одном месте</h1>
        <p className="text-lg text-muted">
          Размещайте предложения для моделей, получайте заявки и сами решайте, кого принять. Размещение бесплатное.
        </p>
        <Link href="/provider" className="btn no-underline">Стать исполнителем</Link>
      </header>

      <section aria-labelledby="who" className="space-y-2">
        <h2 id="who" className="text-xl font-bold">Кто может разместить предложение</h2>
        <p>Школы и академии парикмахерского и бьюти-искусства, колледжи, салоны с обучением и частные мастера.</p>
      </section>

      <section aria-labelledby="steps" className="space-y-2">
        <h2 id="steps" className="text-xl font-bold">Как подключиться</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Войдите и заполните профиль: тип, название, округ, адрес, контакт.</li>
          <li>Дождитесь проверки профиля. Мы смотрим, что это настоящая школа, салон или мастер.</li>
          <li>Создайте предложение: услуга, стоимость для модели, даты и число мест. Оно тоже проходит проверку.</li>
          <li>Получайте заявки, подтверждайте их, а после визита отмечайте, пришла ли модель.</li>
        </ol>
      </section>

      <section aria-labelledby="rules" className="card space-y-2">
        <h2 id="rules" className="text-xl font-bold">Правила размещения</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Честно указывайте стоимость: «полностью бесплатно» или «только материалы» с суммой.</li>
          <li>Принимайте только совершеннолетних моделей: сервис требует подтверждения возраста.</li>
          <li>Адрес и контакты частного мастера видны модели только после подтверждения заявки.</li>
          <li>Фото волос, которые прикладывают модели, нужны только для подготовки к услуге. Не пересылайте их третьим лицам.</li>
          <li>Не заявляйте больше мест, чем реально можете принять.</li>
        </ul>
      </section>
    </div>
  );
}
