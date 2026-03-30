import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  CreditCard,
  Mail,
  Shield,
  Landmark,
  Scale,
} from "lucide-react";

const TARIFFS = [
  {
    name: "FREE",
    price: "0 ₽",
    limit: "50 запросов",
    note: "Только для корпоративных email",
  },
  {
    name: "START",
    price: "3 000 ₽",
    limit: "200 запросов",
    note: "Стартовый платный тариф",
  },
  {
    name: "PRO",
    price: "5 500 ₽",
    limit: "500 запросов",
    note: "Оптимальный баланс",
  },
  {
    name: "MAX",
    price: "9 000 ₽",
    limit: "1000 запросов",
    note: "Для активных закупок",
  },
];

const SECTIONS = [
  {
    title: "1. Общие положения",
    paragraphs: [
      "1.1. Настоящий документ является публичной офертой Индивидуального предпринимателя Дзусова Давида Борисовича, именуемого в дальнейшем «Исполнитель», и содержит предложение заключить договор на условиях, изложенных ниже.",
      "1.2. В соответствии со статьёй 437 Гражданского кодекса Российской Федерации данный документ является официальным предложением.",
      "1.3. Акцептом настоящей оферты является регистрация Пользователя в сервисе SmartOffer, оплата доступа к сервису либо фактическое использование сервиса. С момента акцепта договор считается заключённым.",
    ],
  },
  {
    title: "2. Предмет договора",
    paragraphs: [
      "2.1. Исполнитель предоставляет Пользователю доступ к сервису SmartOffer — системе автоматизации поиска поставщиков и формирования запросов коммерческих предложений (RFQ).",
      "2.2. Доступ предоставляется на условиях выбранного тарифного плана с установленным лимитом использования.",
      "2.3. Сервис не продаёт «запросы» как товар. Пользователь оплачивает доступ к функционалу сервиса.",
    ],
  },
  {
    title: "3. Тарифы и оплата",
    paragraphs: [
      "3.1. Доступ к сервису предоставляется по тарифам, опубликованным на сайте SmartOffer.",
      "3.2. Стоимость тарифов указывается на сайте сервиса и может изменяться Исполнителем в одностороннем порядке до момента оплаты соответствующего тарифа.",
      "3.3. Оплата возможна банковской картой, через систему быстрых платежей (СБП), а также по счёту для юридических лиц и индивидуальных предпринимателей.",
      "3.4. Обязательство по оплате считается исполненным с момента поступления денежных средств на расчётный счёт Исполнителя.",
      "3.5. Услуга считается оказанной с момента предоставления доступа к сервису.",
      "3.6. Возврат денежных средств не производится, за исключением случаев, прямо предусмотренных законодательством Российской Федерации.",
    ],
  },
  {
    title: "4. Порядок оказания услуг",
    paragraphs: [
      "4.1. Доступ к сервису предоставляется после регистрации Пользователя или после оплаты соответствующего тарифа, в зависимости от выбранного сценария использования.",
      "4.2. Пользователь самостоятельно использует функционал сервиса и несёт ответственность за корректность вводимых данных, содержание формируемых запросов и использование подключённой почты.",
      "4.3. Исполнитель не гарантирует получение конкретного коммерческого результата, включая заключение сделки, получение коммерческого предложения или ответ от поставщика.",
    ],
  },
  {
    title: "5. Ограничения и ответственность",
    paragraphs: [
      "5.1. Пользователь обязуется не использовать сервис для рассылки спама, соблюдать законодательство Российской Федерации, нормы деловой переписки и не использовать SmartOffer в противоправных целях.",
      "5.2. В случае злоупотребления сервисом почтовый домен Пользователя может попасть в спам-фильтры, а доступ к сервису может быть ограничен или заблокирован.",
      "5.3. Исполнитель не несёт ответственности за действия третьих лиц, включая поставщиков и почтовые сервисы, за доставку писем, за блокировки почтовых сервисов, а также за последствия использования Пользователем ненадлежащих SMTP-настроек или некорректного содержания писем.",
    ],
  },
  {
    title: "6. Персональные данные",
    paragraphs: [
      "6.1. Пользователь даёт согласие на обработку персональных данных в объёме, необходимом для регистрации, использования сервиса, настройки SMTP, отправки RFQ-писем, получения поддержки и исполнения условий настоящей оферты.",
      "6.2. Обработка персональных данных осуществляется в соответствии с законодательством Российской Федерации, Политикой конфиденциальности и иными опубликованными документами SmartOffer.",
    ],
  },
  {
    title: "7. Документы и закрывающие акты",
    paragraphs: [
      "7.1. При оплате через сайт банковской картой или через СБП акт оказанных услуг не формируется отдельно, а оплата считается акцептом оферты.",
      "7.2. При оплате по счёту для юридических лиц и индивидуальных предпринимателей акт оказанных услуг может формироваться по запросу.",
    ],
  },
  {
    title: "8. Срок действия и расторжение",
    paragraphs: [
      "8.1. Договор действует с момента акцепта настоящей оферты.",
      "8.2. Исполнитель вправе изменять условия оферты в одностороннем порядке. Новая редакция вступает в силу с момента её публикации на сайте, если иное прямо не указано в новой редакции.",
    ],
  },
];

export default function PublicOffer() {
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

        <section className="border border-border rounded-2xl bg-card p-7">
          <div className="flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <BadgeCheck className="w-4 h-4" />
              SmartOffer.pro — публичная оферта
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                Публичная оферта SmartOffer
              </h1>

              <p className="text-muted-foreground leading-relaxed max-w-3xl">
                Настоящий документ регулирует порядок предоставления доступа к сервису
                SmartOffer, условия тарифов, оплаты, использования функционала,
                ограничения ответственности и основные условия взаимодействия
                между Исполнителем и Пользователем.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              Редакция от 30 марта 2026 года
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <FileText className="w-4 h-4" />
              Доступ к сервису
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Пользователь получает доступ к SmartOffer на условиях выбранного
              тарифа и использует функционал сервиса самостоятельно.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <CreditCard className="w-4 h-4" />
              Оплата
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Оплата возможна картой, через СБП и по счёту для юридических лиц.
              Оплата подтверждает акцепт оферты.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Scale className="w-4 h-4" />
              Ответственность
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SmartOffer предоставляет инструмент автоматизации, но не гарантирует
              получение ответа поставщика, сделки или коммерческого предложения.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Тарифы, опубликованные в оферте
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Пользователь оплачивает доступ к функционалу сервиса SmartOffer по
              выбранному тарифному плану.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {TARIFFS.map((tariff) => (
              <div
                key={tariff.name}
                className="border border-border rounded-2xl bg-card p-6"
              >
                <div className="text-sm text-muted-foreground">{tariff.name}</div>
                <div className="text-3xl font-semibold text-foreground mt-2">
                  {tariff.price}
                </div>
                <div className="mt-2 text-foreground font-medium">{tariff.limit}</div>
                <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {tariff.note}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
              className="border border-border rounded-2xl bg-card p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-medium mb-3">
                <FileText className="w-4 h-4" />
                {section.title}
              </div>

              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                {section.paragraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Landmark className="w-4 h-4" />
              Сведения об Исполнителе
            </div>

            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                <span className="text-foreground font-medium">Исполнитель:</span>{" "}
                Индивидуальный предприниматель Дзусов Давид Борисович
              </p>
              <p>
                <span className="text-foreground font-medium">ИНН:</span>{" "}
                151308306407
              </p>
              <p>
                <span className="text-foreground font-medium">ОГРНИП:</span>{" "}
                326150000011464
              </p>
              <p>
                <span className="text-foreground font-medium">Юридический адрес:</span>{" "}
                362040, Россия, Республика Северная Осетия — Алания, г. Владикавказ,
                ул. Джанаева, д. 7
              </p>
            </div>
          </div>

          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Mail className="w-4 h-4" />
              Контакты
            </div>

            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                По техническим вопросам:{" "}
                <a
                  href="mailto:support@smartoffer.pro"
                  className="text-primary hover:underline"
                >
                  support@smartoffer.pro
                </a>
              </p>
              <p>
                По общим и бизнес-вопросам:{" "}
                <a
                  href="mailto:info@smartoffer.pro"
                  className="text-primary hover:underline"
                >
                  info@smartoffer.pro
                </a>
              </p>
              <p>
                Использование SmartOffer после акцепта оферты означает полное
                согласие Пользователя с её условиями.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 border border-border rounded-2xl bg-card p-7">
          <div className="flex items-center gap-2 text-foreground font-medium mb-3">
            <Shield className="w-4 h-4" />
            Подтверждение согласия
          </div>

          <h2 className="text-xl font-semibold text-foreground">
            Регистрация, оплата или фактическое использование SmartOffer означает акцепт оферты
          </h2>

          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
            Пользователь подтверждает, что ознакомился с условиями публичной
            оферты, понимает их содержание и принимает их в полном объёме.
          </p>

          <div className="mt-5">
            <Button asChild variant="outline">
              <Link to="/">Вернуться на главную</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}