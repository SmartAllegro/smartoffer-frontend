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
  Receipt,
  Wallet,
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
      "1.1. Настоящий документ является публичной офертой Индивидуального предпринимателя Дзусова Давида Борисовича, именуемого в дальнейшем «Исполнитель», и содержит предложение заключить договор на условиях, изложенных ниже.",
      "1.2. В соответствии со статьёй 437 Гражданского кодекса Российской Федерации настоящий документ является официальным предложением Исполнителя.",
      "1.3. Акцептом настоящей оферты является оплата доступа к сервису SmartOffer либо отдельное принятие условий оферты в интерфейсе сервиса в тех сценариях, где это прямо предусмотрено функционалом сервиса.",
      "1.4. С момента такого акцепта договор считается заключённым.",
    ],
  },
  {
    title: "2. Предмет договора",
    paragraphs: [
      "2.1. Исполнитель предоставляет Пользователю платный доступ к функционалу сервиса SmartOffer на условиях выбранного тарифного плана.",
      "2.2. SmartOffer является сервисом автоматизации поиска поставщиков, работы с контактами, истории запросов и подготовки/отправки RFQ-писем.",
      "2.3. Пользователь оплачивает не «запросы» как отдельный товар, а доступ к функционалу сервиса и лимиту использования в рамках выбранного тарифа.",
      "2.4. Правила использования сервиса, аккаунта, запреты, ограничения и общие условия работы регулируются Пользовательским соглашением SmartOffer.",
    ],
  },
  {
    title: "3. Тарифы и порядок оплаты",
    paragraphs: [
      "3.1. Доступ к сервису предоставляется по тарифным планам, опубликованным на сайте SmartOffer.",
      "3.2. Стоимость тарифов указывается на сайте и может изменяться Исполнителем в одностороннем порядке до момента оплаты соответствующего тарифа.",
      "3.3. Оплата может производиться банковской картой, через систему быстрых платежей (СБП), а также по счёту для юридических лиц и индивидуальных предпринимателей.",
      "3.4. Обязательство Пользователя по оплате считается исполненным с момента поступления денежных средств на расчётный счёт Исполнителя.",
    ],
  },
  {
    title: "4. Порядок оказания услуг",
    paragraphs: [
      "4.1. Доступ к платному функционалу предоставляется после акцепта оферты и поступления оплаты, если иной сценарий не предусмотрен выбранным тарифом или интерфейсом сервиса.",
      "4.2. Пользователь самостоятельно использует функционал сервиса в пределах предоставленного доступа.",
      "4.3. Исполнитель не гарантирует Пользователю получение конкретного коммерческого результата, включая заключение сделки, получение ответа от поставщика или коммерческого предложения.",
    ],
  },
  {
    title: "5. Момент оказания услуги",
    paragraphs: [
      "5.1. Услуга считается оказанной с момента предоставления Пользователю доступа к соответствующему функционалу сервиса и лимиту использования по выбранному тарифу.",
      "5.2. Факт дальнейшего использования или неиспользования сервиса после предоставления доступа сам по себе не влияет на факт оказания услуги.",
    ],
  },
  {
    title: "6. Возврат денежных средств",
    paragraphs: [
      "6.1. Возврат денежных средств производится только в случаях и в объёме, прямо предусмотренных законодательством Российской Федерации.",
      "6.2. Если доступ к сервису был предоставлен, а услуга считается оказанной по правилам настоящей оферты, отсутствие ожидаемого коммерческого результата, ответа поставщика или заключённой сделки само по себе не является основанием для возврата денежных средств.",
    ],
  },
  {
    title: "7. Документы и закрывающие акты",
    paragraphs: [
      "7.1. При оплате через сайт банковской картой или через СБП отдельный акт оказанных услуг по умолчанию не формируется, а факт оплаты считается акцептом оферты.",
      "7.2. При оплате по счёту для юридических лиц и индивидуальных предпринимателей акт оказанных услуг может формироваться по запросу либо в порядке, согласованном сторонами.",
    ],
  },
  {
    title: "8. Ограничения и ответственность",
    paragraphs: [
      "8.1. Исполнитель не несёт ответственности за действия или бездействие поставщиков, почтовых сервисов, SMTP-провайдеров, банков, платёжных систем и иных третьих лиц.",
      "8.2. Исполнитель не гарантирует бесперебойную доступность сервиса в каждый момент времени, однако принимает разумные меры для поддержания работоспособности сервиса.",
      "8.3. Исполнитель не отвечает за упущенную выгоду, недополученную прибыль, коммерческие потери Пользователя и иные косвенные убытки, если иное прямо не предусмотрено законодательством Российской Федерации.",
    ],
  },
  {
    title: "9. Срок действия, изменение и расторжение",
    paragraphs: [
      "9.1. Договор, заключённый путём акцепта настоящей оферты, действует с момента акцепта.",
      "9.2. Исполнитель вправе изменять условия оферты в одностороннем порядке. Новая редакция вступает в силу с момента публикации на сайте, если иное не указано дополнительно.",
      "9.3. К уже оплаченному доступу применяется редакция оферты, действовавшая на момент акцепта, если иное не вытекает из закона или прямо не согласовано сторонами.",
    ],
  },
  {
    title: "10. Претензии и споры",
    paragraphs: [
      "10.1. До обращения в суд сторона направляет другой стороне письменную претензию по контактам, опубликованным на сайте или в документах SmartOffer.",
      "10.2. Срок рассмотрения претензии составляет 15 календарных дней с момента её получения, если иной срок не вытекает из законодательства Российской Федерации.",
      "10.3. Если спор не урегулирован в претензионном порядке, он подлежит рассмотрению в суде в соответствии с законодательством Российской Федерации.",
    ],
  },
  {
    title: "11. Реквизиты Исполнителя",
    paragraphs: [
      "Индивидуальный предприниматель Дзусов Давид Борисович",
      "ИНН: 151308306407",
      "ОГРНИП: 326150000011464",
      "Юридический адрес: 362040, Россия, Республика Северная Осетия — Алания, г. Владикавказ, ул. Джанаева, д. 7",
      "Расчётный счёт: 40802810200009476331",
      "Банк: АО «ТБанк»",
      "БИК: 044525974",
      "Корреспондентский счёт: 30101810145250000974",
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
                Настоящий документ регулирует коммерческие условия платного доступа
                к SmartOffer: тарифы, оплату, момент оказания услуги, закрывающие документы,
                возвраты и иные финансово-договорные условия.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              Редакция от 5 апреля 2026 года
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Wallet className="w-4 h-4" />
              Тарифы
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Доступ предоставляется по тарифным планам с установленными лимитами.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <CreditCard className="w-4 h-4" />
              Оплата
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Оплата возможна картой, через СБП и по счёту для юридических лиц.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Receipt className="w-4 h-4" />
              Оказание услуги
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Услуга считается оказанной с момента предоставления доступа к платному функционалу.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Scale className="w-4 h-4" />
              Споры
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              До суда применяется обязательный претензионный порядок.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Тарифы, опубликованные в оферте
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Пользователь оплачивает доступ к функционалу сервиса SmartOffer
              и лимиту использования по выбранному тарифному плану.
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
                По техническим и правовым вопросам:{" "}
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
                Правила использования сервиса, аккаунта и SMTP регулируются
                Пользовательским соглашением SmartOffer.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 border border-border rounded-2xl bg-card p-7">
          <div className="flex items-center gap-2 text-foreground font-medium mb-3">
            <Shield className="w-4 h-4" />
            Подтверждение акцепта
          </div>

          <h2 className="text-xl font-semibold text-foreground">
            Оплата доступа или отдельное принятие оферты в интерфейсе означает её акцепт
          </h2>

          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
            Пользователь подтверждает, что ознакомился с коммерческими условиями доступа к SmartOffer,
            понимает их содержание и принимает их в полном объёме в применимых сценариях.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/terms">Пользовательское соглашение</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">На главную</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}