import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Shield,
  Mail,
  Ban,
  RefreshCcw,
  Landmark,
} from "lucide-react";

const TARIFFS = [
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
    note: "Стартовый платный тариф",
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

const SECTIONS = [
  {
    title: "1. Общие положения",
    paragraphs: [
      "Настоящие Условия использования регулируют порядок доступа к сервису SmartOffer и правила его использования пользователями.",
      "Используя сайт и сервис SmartOffer, пользователь подтверждает, что ознакомился с настоящими Условиями, понимает их содержание и принимает их в полном объёме.",
      "Если пользователь не согласен с настоящими Условиями, он обязан прекратить использование сервиса.",
    ],
  },
  {
    title: "2. Назначение сервиса",
    paragraphs: [
      "SmartOffer — это SaaS-сервис для автоматизации поиска поставщиков, извлечения открытых контактных данных и отправки запросов коммерческих предложений (RFQ).",
      "Сервис помогает пользователю ускорить рутинные операции по поиску релевантных компаний и подготовке исходящих запросов. SmartOffer не гарантирует заключение сделки, получение коммерческого предложения, наличие товара у поставщика или достоверность информации, размещённой на сторонних сайтах.",
      "Под одним запросом в рамках сервиса понимается один поиск поставщиков по одной потребности пользователя.",
    ],
  },
  {
    title: "3. Регистрация и аккаунт",
    paragraphs: [
      "Для использования части функций сервиса пользователь проходит регистрацию и создаёт личный аккаунт.",
      "Пользователь обязан предоставлять достоверные данные, поддерживать их актуальность и обеспечивать конфиденциальность доступа к своему аккаунту.",
      "Пользователь самостоятельно несёт ответственность за все действия, совершённые под его учётной записью.",
    ],
  },
  {
    title: "4. Тарифы и объём доступа",
    paragraphs: [
      "Доступ к функционалу SmartOffer может предоставляться как на бесплатной, так и на платной основе в зависимости от выбранного тарифа.",
      "На момент публикации настоящей редакции сервиса предусмотрены тарифы, указанные ниже. Оператор вправе изменять тарифы, лимиты, состав функций и условия предоставления доступа в одностороннем порядке с публикацией новой редакции на сайте.",
    ],
  },
  {
    title: "5. SMTP, письма и ответственность пользователя",
    paragraphs: [
      "Функция отправки RFQ-писем работает через SMTP-настройки, предоставленные пользователем. Письма отправляются от имени пользователя и с использованием его почтового ящика либо почтовой инфраструктуры, которую он подключил к сервису.",
      "Пользователь обязан использовать только те почтовые аккаунты и SMTP-учётные данные, которыми он вправе распоряжаться на законных основаниях.",
      "Пользователь самостоятельно отвечает за содержание отправляемых писем, корректность адресатов, соблюдение деловой этики, требований применимого законодательства и внутренних правил своей организации.",
      "SmartOffer предоставляет технический инструмент автоматизации, но не принимает на себя роль инициатора коммерческого предложения, рекламодателя, продавца или агента пользователя.",
    ],
  },
  {
    title: "6. Допустимое использование и запреты",
    paragraphs: [
      "Пользователь обязуется использовать сервис исключительно в законных и добросовестных целях, связанных с поиском поставщиков, обработкой закупочных задач и деловой коммуникацией.",
      "Пользователю запрещается:",
    ],
    bullets: [
      "использовать сервис для массового спама, навязчивых рассылок, фишинга, мошенничества либо иной недобросовестной активности;",
      "загружать, отправлять или формировать противоправный, оскорбительный, ложный либо вводящий в заблуждение контент;",
      "обходить технические ограничения сервиса, пытаться получить несанкционированный доступ к данным, инфраструктуре или коду;",
      "использовать сервис способом, который может причинить вред репутации доменов, почтовых ящиков, инфраструктуры SmartOffer или третьих лиц;",
      "передавать доступ к аккаунту третьим лицам без согласия оператора, если это нарушает модель использования сервиса.",
    ],
  },
  {
    title: "7. Последствия нарушений",
    paragraphs: [
      "При выявлении признаков злоупотребления сервисом оператор вправе ограничить функциональность аккаунта пользователя, временно приостановить доступ либо полностью заблокировать аккаунт без возврата средств за уже оказанный период доступа.",
      "Если действия пользователя приводят к жалобам, блокировкам, попаданию писем в спам, репутационным рискам, техническим инцидентам или претензиям третьих лиц, пользователь несёт ответственность за такие последствия самостоятельно.",
    ],
  },
  {
    title: "8. Интеллектуальные права",
    paragraphs: [
      "Все права на сайт, программный код, интерфейс, дизайн, тексты, структуру сервиса и иные элементы SmartOffer принадлежат оператору либо используются им на законных основаниях.",
      "Пользователю предоставляется ограниченное, неисключительное, непередаваемое право использования сервиса в пределах его функционального назначения на срок действия доступа.",
      "Запрещаются копирование, декомпиляция, модификация, перепродажа, sublicensing и иное использование сервиса за пределами прямо разрешённого назначения без письменного согласия оператора.",
    ],
  },
  {
    title: "9. Ограничение ответственности",
    paragraphs: [
      "Сервис предоставляется по модели «как есть» и «по мере доступности». Оператор не гарантирует бесперебойную и безошибочную работу всех функций в каждый момент времени.",
      "Оператор не несёт ответственности за сбои и ограничения, вызванные действиями почтовых провайдеров, поисковых систем, сторонних сайтов, сетевой инфраструктуры, браузеров, хостинга, форс-мажора и иных внешних факторов.",
      "Оператор не отвечает за убытки пользователя, упущенную выгоду, потерю данных, непринятые письма, блокировки SMTP, фильтрацию писем антиспам-системами или иные косвенные последствия использования сервиса.",
    ],
  },
  {
    title: "10. Изменение условий и развитие сервиса",
    paragraphs: [
      "Оператор вправе в любое время изменять настоящие Условия, тарифы, состав функций, лимиты, интерфейс и техническую архитектуру сервиса.",
      "Новая редакция вступает в силу с момента её публикации на сайте, если иной срок не указан дополнительно.",
      "Продолжение использования сервиса после публикации новой редакции означает согласие пользователя с обновлёнными условиями.",
    ],
  },
  {
    title: "11. Прекращение использования",
    paragraphs: [
      "Пользователь вправе прекратить использование сервиса в любое время.",
      "Оператор вправе прекратить или ограничить доступ пользователя к сервису при нарушении настоящих Условий, при наличии угроз безопасности, злоупотреблений, технических рисков либо по иным основаниям, необходимым для защиты сервиса и третьих лиц.",
    ],
  },
  {
    title: "12. Применимое право и контакты",
    paragraphs: [
      "К отношениям между пользователем и оператором применяется право Российской Федерации.",
      "Все обращения, связанные с использованием сервиса, могут направляться оператору по контактам, указанным на сайте.",
    ],
  },
];

export default function Terms() {
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
              SmartOffer.pro — условия использования
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                Условия использования SmartOffer
              </h1>

              <p className="text-muted-foreground leading-relaxed max-w-3xl">
                Настоящий документ определяет правила доступа к сервису SmartOffer,
                порядок его использования, рамки ответственности сторон и базовые
                условия работы с поиском поставщиков и отправкой RFQ-запросов.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              Редакция от 19 марта 2026 года
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Mail className="w-4 h-4" />
              Исходящие письма
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Письма отправляются от имени пользователя через подключённые им SMTP-настройки.
              Пользователь отвечает за законность использования почты, адресатов и содержимое сообщений.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Shield className="w-4 h-4" />
              Деловой сценарий
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SmartOffer предназначен для автоматизации поиска поставщиков и ускорения
              деловых RFQ-коммуникаций, а не для безадресных рекламных или спам-рассылок.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Ban className="w-4 h-4" />
              Нарушения
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              При злоупотреблении сервисом оператор вправе ограничить функциональность,
              приостановить доступ или заблокировать аккаунт для защиты инфраструктуры и репутации домена.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Тарифы на момент публикации
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {TARIFFS.map((tariff) => (
              <div
                key={tariff.name}
                className="border border-border rounded-2xl bg-card p-5"
              >
                <div className="text-sm text-muted-foreground">{tariff.name}</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {tariff.price}
                </div>
                <div className="mt-2 text-sm text-foreground">{tariff.limit}</div>
                <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
                  {tariff.note}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border border-border rounded-2xl bg-card p-5 text-sm text-muted-foreground leading-relaxed">
            Лимиты привязаны к количеству запросов в сервисе. Оператор вправе изменять
            тарифы, лимиты, состав функций и условия доступа с публикацией обновлённой редакции на сайте.
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

                {section.bullets && (
                  <ul className="list-disc pl-5 space-y-2">
                    {section.bullets.map((bullet, idx) => (
                      <li key={idx}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Landmark className="w-4 h-4" />
              Сведения об операторе
            </div>

            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                <span className="text-foreground font-medium">Оператор:</span>{" "}
                Индивидуальный предприниматель Дзусов Давид Борисович
              </p>
              <p>
                <span className="text-foreground font-medium">Адрес:</span>{" "}
                362040, Россия, Республика Северная Осетия — Алания, г. Владикавказ,
                ул. Джанаева, д. 7
              </p>
              <p>
                <span className="text-foreground font-medium">ИНН:</span> 151308306407
              </p>
              <p>
                <span className="text-foreground font-medium">ОГРНИП:</span> 326150000011464
              </p>
            </div>
          </div>

          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <RefreshCcw className="w-4 h-4" />
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
                Оператор вправе обновлять настоящие Условия без индивидуального уведомления,
                размещая актуальную редакцию на сайте.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 border border-border rounded-2xl bg-card p-7">
          <h2 className="text-xl font-semibold text-foreground">
            Продолжая использовать SmartOffer, вы подтверждаете согласие с настоящими Условиями
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
            При регистрации, входе в аккаунт, подключении SMTP и использовании поиска
            поставщиков пользователь принимает правила работы сервиса и обязуется использовать
            его добросовестно и в рамках деловой коммуникации.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/">Вернуться на главную</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}