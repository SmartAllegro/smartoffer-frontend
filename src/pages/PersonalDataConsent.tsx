﻿import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import {
  ArrowLeft,
  BadgeCheck,
  Shield,
  Database,
  Mail,
  FileText,
  Landmark,
  UserCheck,
  Lock,
} from "lucide-react";

const SECTIONS = [
  {
    title: "1. Предмет согласия",
    paragraphs: [
      "Настоящим пользователь, действуя свободно, своей волей и в своём интересе, даёт согласие на обработку своих персональных данных оператору сервиса SmartOffer.",
      "Согласие даётся в целях регистрации и использования аккаунта, настройки SMTP, отправки RFQ-писем, ведения истории операций, технической поддержки, обеспечения безопасности и стабильной работы сервиса SmartOffer.",
      "Согласие распространяется на обработку персональных данных как с использованием средств автоматизации, так и без их использования, если это необходимо по характеру соответствующих операций.",
    ],
  },
  {
    title: "2. Оператор персональных данных",
    paragraphs: [
      "Оператором персональных данных является Индивидуальный предприниматель Дзусов Давид Борисович.",
      "Оператор самостоятельно определяет цели обработки персональных данных, состав подлежащих обработке данных и действия, совершаемые с ними в рамках функционирования SmartOffer.",
    ],
  },
  {
    title: "3. Категории персональных данных",
    paragraphs: [
      "Пользователь даёт согласие на обработку следующих категорий персональных данных, которые могут предоставляться им при использовании сервиса:",
    ],
    bullets: [
      "имя, фамилия, адрес электронной почты и иные данные учётной записи;",
      "данные авторизации и безопасности аккаунта;",
      "SMTP-данные, необходимые для отправки писем от имени пользователя: email отправителя, SMTP login, SMTP host, порт, тип защиты, пароль приложения или иной SMTP-пароль;",
      "данные, связанные с использованием SmartOffer: поисковые запросы, история поиска, история отправленных RFQ-писем, тема и текст письма, статусы доставки, отметки о полученных коммерческих предложениях;",
      "технические и служебные данные: IP-адрес, данные браузера, дата и время обращений, журналирование ошибок, request_id и иные технические идентификаторы;",
      "данные обращений пользователя в поддержку и иная информация, передаваемая пользователем через интерфейс сервиса.",
    ],
  },
  {
    title: "4. Цели обработки персональных данных",
    paragraphs: [
      "Обработка персональных данных осуществляется в следующих целях:",
    ],
    bullets: [
      "создание и обслуживание аккаунта пользователя;",
      "аутентификация, авторизация и восстановление доступа к аккаунту;",
      "настройка и хранение SMTP-параметров пользователя для отправки писем от его имени;",
      "поиск поставщиков, сохранение истории запросов и результатов поиска;",
      "формирование, отправка и сопровождение RFQ-писем;",
      "обработка обращений в поддержку, диагностика ошибок и улучшение качества сервиса;",
      "обработка запроса на удаление аккаунта или прекращение использования сервиса;",
      "исполнение обязанностей оператора, предусмотренных законодательством Российской Федерации, и защита законных интересов оператора.",
    ],
  },
  {
    title: "5. Действия с персональными данными",
    paragraphs: [
      "В рамках настоящего согласия оператор вправе осуществлять с персональными данными следующие действия: сбор, запись, систематизацию, накопление, хранение, уточнение, извлечение, использование, передачу, обезличивание, блокирование и удаление в пределах, необходимых для достижения указанных целей.",
      "Если это требуется для работы сервиса, часть данных может обрабатываться с привлечением технических подрядчиков, инфраструктурных провайдеров, хостинг-платформ, почтовых провайдеров и иных лиц, обеспечивающих функционирование SmartOffer.",
    ],
  },
  {
    title: "6. Особенности SMTP и отправки писем",
    paragraphs: [
      "Подключая SMTP-настройки в SmartOffer, пользователь подтверждает, что вправе использовать соответствующий почтовый ящик и передаваемые SMTP-учётные данные на законных основаниях.",
      "Пользователь понимает, что для выполнения функции отправки писем SmartOffer обрабатывает данные email отправителя, SMTP login, пароль приложения и иные технические параметры, необходимые для работы почтового канала.",
      "Пользователь также понимает, что исходящие письма отправляются от его имени, а адресаты видят email отправителя, тему и содержание письма, сформированные пользователем в сервисе.",
    ],
  },
  {
    title: "7. Срок действия согласия",
    paragraphs: [
      "Настоящее согласие действует с момента его предоставления и сохраняет силу в течение срока использования сервиса SmartOffer, а также в течение периода, необходимого для достижения целей обработки, если иной срок не требуется законодательством Российской Федерации или внутренней политикой хранения данных сервиса.",
      "После достижения целей обработки либо при отзыве согласия оператор прекращает обработку персональных данных, если иное не требуется по закону или для защиты законных интересов оператора.",
    ],
  },
  {
    title: "8. Отзыв согласия",
    paragraphs: [
      "Пользователь вправе отозвать настоящее согласие путём направления обращения оператору по контактам, указанным на сайте SmartOffer.",
      "Отзыв согласия не влияет на законность обработки, осуществлённой до момента получения оператором соответствующего обращения.",
      "Пользователь понимает, что отзыв согласия на обработку данных, необходимых для базовых функций SmartOffer, может сделать невозможным дальнейшее использование части или всего функционала сервиса.",
      "При наличии в сервисе функции удаления аккаунта пользователь также может инициировать прекращение использования сервиса через интерфейс продукта.",
    ],
  },
  {
    title: "9. Подтверждение пользователя",
    paragraphs: [
      "Пользователь подтверждает, что предоставленные им данные являются актуальными и относятся к нему либо используются им на законных основаниях.",
      "Пользователь подтверждает, что ознакомился с Политикой конфиденциальности, Политикой хранения данных и иными документами SmartOffer, связанными с обработкой и защитой персональных данных.",
    ],
  },
];

export default function PersonalDataConsent() {
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
              SmartOffer.pro — согласие на обработку персональных данных
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                Согласие на обработку персональных данных
              </h1>

              <p className="text-muted-foreground leading-relaxed max-w-3xl">
                Настоящий документ используется для подтверждения согласия
                пользователя на обработку персональных данных, необходимых для
                работы аккаунта SmartOffer, настройки SMTP и отправки деловых RFQ-писем.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              Редакция от 25 марта 2026 года
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Shield className="w-4 h-4" />
              Правовая основа
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Согласие подтверждает право оператора обрабатывать данные,
              необходимые для предоставления пользователю функционала SmartOffer.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Mail className="w-4 h-4" />
              SMTP и письма
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Отдельно охватывается обработка SMTP-данных пользователя для
              отправки писем от имени его почтового аккаунта.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Lock className="w-4 h-4" />
              Безопасность
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SmartOffer использует данные только в объёме, необходимом для
              функционирования сервиса, безопасности и технической поддержки.
            </p>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <UserCheck className="w-4 h-4" />
              Аккаунт
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Имя, фамилия, email и данные входа.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Mail className="w-4 h-4" />
              SMTP
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              SMTP host, login, email отправителя и пароль приложения.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Database className="w-4 h-4" />
              История
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Запросы, результаты поиска, письма и статусы доставки.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <FileText className="w-4 h-4" />
              Поддержка
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Текст обращений и техническая диагностика.
            </p>
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
                362040, Россия, Республика Северная Осетия — Алания,
                г. Владикавказ, ул. Джанаева, д. 7
              </p>
              <p>
                <span className="text-foreground font-medium">ИНН:</span>{" "}
                151308306407
              </p>
              <p>
                <span className="text-foreground font-medium">ОГРНИП:</span>{" "}
                326150000011464
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
                По вопросам персональных данных и технической поддержки:{" "}
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
                Отзыв согласия допускается путём направления обращения оператору
                по указанным контактам.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 border border-border rounded-2xl bg-card p-7">
          <h2 className="text-xl font-semibold text-foreground">
            Подтверждение согласия означает принятие условий обработки данных в SmartOffer
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
            При установке галочки в настройках SMTP пользователь подтверждает,
            что ознакомился с настоящим согласием и даёт оператору право
            обрабатывать персональные данные в объёме, необходимом для работы сервиса.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/privacy">Политика конфиденциальности</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/data-retention">Политика хранения данных</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}