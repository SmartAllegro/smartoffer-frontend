import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { BadgeCheck, Mail, Shield, Zap, ArrowLeft } from "lucide-react";

const PRICING = [
  {
    name: "Free",
    price: "0 ₽",
    limit: "50 запросов",
    note: "Только для корпоративной почты",
  },
  {
    name: "200",
    price: "3 000 ₽",
    limit: "200 запросов",
    note: "Старт для регулярных RFQ",
  },
  {
    name: "500",
    price: "5 500 ₽",
    limit: "500 запросов",
    note: "Оптимальный баланс",
  },
  {
    name: "1000",
    price: "9 000 ₽",
    limit: "1000 запросов",
    note: "Для активных закупок",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              На главную
            </Link>
          </Button>
        </div>

        {/* HERO */}
        <section className="border border-border rounded-2xl bg-card p-7">
          <div className="flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <BadgeCheck className="w-4 h-4" />
              SmartOffer.pro — автоматизация RFQ
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                SmartOffer ускоряет поиск поставщиков и отправку запросов КП
              </h1>

              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                Сервис помогает компаниям быстро находить поставщиков по запросу
                оборудования, извлекать контакты и отправлять RFQ-письма. Тарификация
                не “за пользователя”, а за объём ценности: готовые контакты поставщиков
                под конкретный RFQ.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
                Запросить доступ
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href="#pricing">Посмотреть тарифы</a>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground max-w-2xl">
              “Запрос” — один поиск поставщиков под один RFQ с формированием результатов и
              возможностью отправки письма.
            </div>
          </div>
        </section>

        {/* TRUST / VALUE */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ЛЕВАЯ КАРТОЧКА */}
          <div className="border border-border rounded-2xl bg-card p-6 flex flex-col">
            <div>
              <div className="flex items-center gap-2 text-foreground font-medium mb-2">
                <Mail className="w-4 h-4" />
                Почему вы получили письмо
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Ваш email найден в открытых источниках (сайт/каталоги/страницы “Контакты”).
                Письмо отправлено пользователем сервиса SmartOffer.pro — он в данный момент
                ищет поставщика для поставки оборудования, а SmartOffer лишь ускоряет
                поиск и подготовку запроса RFQ.
              </p>

              <div className="mt-4">
                <div className="text-foreground font-medium mb-2">
                  Для кого создан SmartOffer
                </div>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  <li>Закупочные отделы</li>
                  <li>Инженерные компании</li>
                  <li>Дистрибьюторы оборудования</li>
                  <li>B2B-продажи</li>
                  <li>Производственные предприятия</li>
                </ul>
              </div>

              {/* ✅ ДОБАВЛЕНО: Пример в цифрах */}
              <div className="mt-5 pt-4 border-t border-border">
                <div className="text-foreground font-medium mb-2">
                  Пример в цифрах
                </div>

                <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                  <p>Менеджер тратит 20–30 минут на поиск 1 позиции оборудования вручную.</p>
                  <p>Через SmartOffer — 1 минуту.</p>
                  <p>
                    При большом объёме закупочного оборудования — экономия до 40 часов в месяц.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ЦЕНТРАЛЬНАЯ КАРТОЧКА */}
          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Zap className="w-4 h-4" />
              Эффект от использования SmartOffer.pro
            </div>

            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>
                SmartOffer сокращает до 30% рабочего времени, которое сотрудники тратят
                на поиск оборудования и контактов поставщиков.
              </p>

              <div>
                <p className="text-foreground font-medium mb-2">Что это даёт бизнесу:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Больше обработанных запросов за тот же день</li>
                  <li>Рост количества отправленных RFQ</li>
                  <li>Увеличение числа сделок без расширения штата</li>
                  <li>Снижение операционной нагрузки на менеджеров</li>
                  <li>Освобождение времени для переговоров и закрытия контрактов</li>
                </ul>
              </div>

              <p>
                SmartOffer автоматизирует рутинный этап поиска и подготовки запроса —
                команда концентрируется на коммерческой работе, а не на ручном сборе контактов.
              </p>
            </div>
          </div>

          {/* ПРАВАЯ КАРТОЧКА */}
          <div className="border border-border rounded-2xl bg-card p-6 flex flex-col">
            <div>
              <div className="flex items-center gap-2 text-foreground font-medium mb-2">
                <Shield className="w-4 h-4" />
                Безопасность и контроль
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Письма отправляются от имени пользователя через его корпоративную почту (SMTP).
                SmartOffer не продаёт базы и не публикует контакты —
                фиксируется история и статусы отправки для прозрачности.
              </p>

              <div className="mt-4">
                <div className="text-foreground font-medium mb-2">
                  Чем SmartOffer отличается от обычного поиска
                </div>

                <div className="text-sm text-muted-foreground space-y-2">
                  <div>
                    <span className="text-foreground">Google</span> ищет сайты. <br />
                    <span className="text-foreground">SmartOffer</span> ищет контакты и готовит RFQ.
                  </div>

                  <div>
                    <span className="text-foreground">Google</span> не хранит историю запросов. <br />
                    <span className="text-foreground">SmartOffer</span> фиксирует статусы и результат.
                  </div>

                  <div>
                    <span className="text-foreground">Google</span> не отправляет письма. <br />
                    <span className="text-foreground">SmartOffer</span> отправляет в 1 клик.
                  </div>
                </div>
              </div>

              {/* ✅ ДОБАВЛЕНО: Почему это выгодно поставщику */}
              <div className="mt-5 pt-4 border-t border-border">
                <div className="text-foreground font-medium mb-2">
                  Почему это выгодно поставщику
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Поставщик получает структурированный запрос
                  с понятной спецификацией и конкретной потребностью.
                  Это не холодная рассылка — это входящий RFQ.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Как работает SmartOffer
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: "Шаг 1",
                title: "Поиск поставщиков",
                text: "Введите запрос оборудования — получите список релевантных компаний.",
              },
              {
                step: "Шаг 2",
                title: "Контакты",
                text: "SmartOffer извлекает email и готовит список для рассылки.",
              },
              {
                step: "Шаг 3",
                title: "Отправка RFQ",
                text: "Вы выбираете поставщиков и отправляете письмо в 1 клик.",
              },
              {
                step: "Шаг 4",
                title: "История",
                text: "Результаты, статусы отправки и текст письма сохраняются.",
              },
            ].map((c) => (
              <div
                key={c.step}
                className="border border-border rounded-2xl bg-card p-6"
              >
                <div className="text-xs text-muted-foreground mb-2">{c.step}</div>
                <div className="font-medium text-foreground mb-2">{c.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {c.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="mt-12">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">Тарифы и лимиты</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Оплата за объём реальной ценности — готовые контакты поставщиков под ваши RFQ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className="border border-border rounded-2xl bg-card p-6 flex flex-col min-h-[230px]"
              >
                <div>
                  <div className="text-sm text-muted-foreground">{p.name}</div>
                  <div className="text-2xl font-semibold text-foreground mt-2">
                    {p.price}
                  </div>
                  <div className="mt-2 text-sm text-foreground">{p.limit}</div>
                  <div className="mt-3 text-xs text-muted-foreground">{p.note}</div>
                </div>

                {/* ✅ кнопка всегда внизу карточки, поэтому все на одном уровне */}
                <div className="mt-auto pt-5">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Выбрать
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-muted-foreground max-w-2xl">
            Free доступен для корпоративной почты — это снижает злоупотребления и повышает качество коммуникаций.
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">FAQ</h2>

          <div className="space-y-3">
            <div className="border border-border rounded-2xl bg-card p-6">
              <div className="font-medium text-foreground">Это спам-рассылка?</div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Нет. Письмо — запрос КП от пользователя сервиса SmartOffer.pro, который ищет поставщика.
                SmartOffer лишь ускоряет поиск контакта и оформление RFQ.
              </p>
            </div>

            <div className="border border-border rounded-2xl bg-card p-6">
              <div className="font-medium text-foreground">Откуда взяли мой email?</div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Из открытых источников: сайт компании, каталоги, страницы “Контакты”.
              </p>
            </div>

            <div className="border border-border rounded-2xl bg-card p-6">
              <div className="font-medium text-foreground">SmartOffer хранит базы поставщиков?</div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Нет. Сервис фиксирует историю запросов пользователя и результаты поиска для его работы.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 border border-border rounded-2xl bg-card p-7">
          <h2 className="text-xl font-semibold text-foreground">
            Хотите ускорить запросы КП в вашей компании?
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">
            Подключайтесь к SmartOffer и сокращайте время на поиск поставщиков и подготовку RFQ.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
              Запросить доступ
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/">Вернуться на главную</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}