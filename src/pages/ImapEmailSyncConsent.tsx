import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Database,
  FileText,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/shared/ui/button";

const SECTIONS = [
  {
    icon: FileText,
    title: "1. Предмет согласия",
    paragraphs: [
      "1.1 Настоящим пользователь, действуя свободно, своей волей и в своём интересе, даёт согласие оператору сервиса SmartOffer на обработку email-данных, необходимых для синхронизации ответов поставщиков по запросам, отправленным через сервис.",
      "1.2 Согласие действует в целях подключения рабочей электронной почты пользователя по протоколу IMAP, поиска ответов поставщиков, сохранения релевантной переписки в истории запроса и отображения диалога с поставщиком внутри SmartOffer.",
      "1.3 SmartOffer не предназначен для обработки всей рабочей переписки пользователя. Обработка ограничивается письмами, относящимися к запросам SmartOffer.",
    ],
  },
  {
    icon: Building2,
    title: "2. Оператор персональных данных",
    paragraphs: [
      "2.1 Оператором персональных данных является Индивидуальный предприниматель Дзусов Давид Борисович, ИНН 15130836407, ОГРНИП 326150000111464, адрес: 362040, Российская Федерация, Республика Северная Осетия — Алания, г. Владикавказ, ул. Джанаева, д. 7.",
      "2.2 Оператор самостоятельно определяет цели обработки email-данных, состав подлежащих обработке данных и действия, совершаемые с ними в рамках функционирования сервиса SmartOffer.",
    ],
  },
  {
    icon: Mail,
    title: "3. Категории обрабатываемых email-данных",
    paragraphs: [
      "3.1 Пользователь даёт согласие на обработку следующих категорий данных, которые могут использоваться при синхронизации ответов поставщиков:",
      "• адрес электронной почты пользователя;",
      "• технические параметры подключения к почтовому ящику;",
      "• пароль приложения, используемый для подключения к почте, исключительно в зашифрованном виде;",
      "• заголовки писем, включая отправителя, получателя, тему, дату, Message-ID, In-Reply-To и References;",
      "• текст писем, относящихся к запросам SmartOffer;",
      "• вложения, относящиеся к коммерческим предложениям поставщиков;",
      "• статусы обработки писем, признаки получения КП, ошибки обработки и технические журналы.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "4. Цели обработки",
    paragraphs: [
      "4.1 Email-данные обрабатываются для автоматического поиска ответов поставщиков по запросам SmartOffer.",
      "4.2 Данные используются для сохранения ответов поставщиков в истории запроса, сохранения ответов пользователя поставщикам в диалоге запроса, определения статуса ответа поставщика и отображения переписки по конкретному запросу.",
      "4.3 Статус ответа может включать следующие значения: «в работе», «КП получено», «отказ», «уточнение» или «требуется проверка».",
    ],
  },
  {
    icon: Database,
    title: "5. Ограничение обработки",
    paragraphs: [
      "5.1 SmartOffer проверяет и сохраняет только письма, относящиеся к запросам сервиса.",
      "5.2 К таким письмам относятся письма с ID запроса вида [SO-...], письма, связанные с исходящим запросом через In-Reply-To или References, а также письма в той же цепочке переписки по запросу SmartOffer.",
      "5.3 Посторонние письма, не относящиеся к запросам SmartOffer, не сохраняются в истории сервиса.",
      "5.4 Если письмо не может быть уверенно связано с запросом SmartOffer, оно не должно автоматически попадать в историю запроса как подтверждённый ответ поставщика.",
    ],
  },
  {
    icon: Database,
    title: "6. Сроки хранения",
    paragraphs: [
      "6.1 IMAP-настройки хранятся до момента их обновления или удаления пользователем либо до удаления аккаунта.",
      "6.2 Пароль приложения, используемый для IMAP-доступа, хранится исключительно в зашифрованном виде.",
      "6.3 Данные email-переписки, относящиеся к запросам SmartOffer, включая тему, текст, вложения, статусы обработки и ошибки синхронизации, хранятся в течение срока существования аккаунта и 30 дней после его удаления.",
      "6.4 Данные юридического подтверждения настоящего согласия хранятся в течение 3 лет с момента прекращения использования сервиса.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "7. Отзыв согласия",
    paragraphs: [
      "7.1 Пользователь вправе отозвать настоящее согласие путём направления обращения оператору по контактам, указанным в настоящем документе.",
      "7.2 После отзыва согласия SmartOffer прекращает подключение к рабочей почте пользователя по IMAP и больше не получает новые письма из почтового ящика пользователя.",
      "7.3 Ранее сохранённые данные, относящиеся к запросам SmartOffer, хранятся в соответствии с установленными сроками хранения данных сервиса.",
    ],
  },
  {
    icon: FileText,
    title: "8. Подтверждение пользователя",
    paragraphs: [
      "8.1 Пользователь подтверждает, что предоставленные им данные являются актуальными и относятся к нему либо используются им на законных основаниях.",
      "8.2 Пользователь подтверждает, что до установки отметки ознакомился с Политикой конфиденциальности, Политикой хранения данных и настоящим согласием.",
      "8.3 Настоящее согласие подтверждается пользователем путём установки отдельной отметки при настройке почты в разделе настроек аккаунта SmartOffer.",
    ],
  },
];

export default function ImapEmailSyncConsent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              На главную
            </Link>
          </Button>
        </div>

        <header className="rounded-2xl border border-border bg-card p-7">
          <p className="text-sm text-muted-foreground">
            SmartOffer.pro — согласие на обработку email-данных
          </p>

          <h1 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">
            Согласие на обработку email-данных для синхронизации ответов поставщиков
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Настоящий документ используется для подтверждения согласия пользователя
            на обработку email-данных, необходимых для подключения рабочей почты по
            IMAP и сохранения ответов поставщиков в истории SmartOffer.
          </p>

          <p className="mt-6 text-sm text-muted-foreground">
            Редакция от 28 мая 2026 года
          </p>
        </header>

        <div className="mt-8 space-y-5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;

            return (
              <section
                key={section.title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />

                  <h2 className="text-lg font-semibold text-foreground">
                    {section.title}
                  </h2>
                </div>

                <div className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => {
                    if (paragraph.startsWith("•")) {
                      return (
                        <p key={paragraph} className="pl-4">
                          {paragraph}
                        </p>
                      );
                    }

                    return <p key={paragraph}>{paragraph}</p>;
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">
                Сведения об операторе
              </h2>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Оператор:</span>{" "}
                Индивидуальный предприниматель Дзусов Давид Борисович
              </p>

              <p>
                <span className="font-semibold text-foreground">Адрес:</span>{" "}
                362040, Россия, Республика Северная Осетия — Алания, г.
                Владикавказ, ул. Джанаева, д. 7
              </p>

              <p>
                <span className="font-semibold text-foreground">ИНН:</span>{" "}
                15130836407
              </p>

              <p>
                <span className="font-semibold text-foreground">ОГРНИП:</span>{" "}
                326150000111464
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">
                Контакты
              </h2>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                По вопросам персональных данных и технической поддержки:
                <br />
                <a
                  href="mailto:support@smartoffer.pro"
                  className="text-primary hover:underline"
                >
                  support@smartoffer.pro
                </a>
              </p>

              <p>
                По общим и бизнес-вопросам:
                <br />
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
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-card p-7">
          <h2 className="text-xl font-semibold text-foreground">
            Подтверждение согласия означает принятие условий обработки email-данных в SmartOffer
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            При установке отдельной отметки в настройках почты пользователь
            подтверждает, что ознакомился с настоящим согласием и даёт оператору
            право обрабатывать email-данные в объёме, необходимом для
            синхронизации ответов поставщиков по запросам SmartOffer.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/privacy">Политика конфиденциальности</Link>
            </Button>

            <Button asChild variant="outline">
              <Link to="/data-retention">Политика хранения данных</Link>
            </Button>

            <Button asChild variant="outline">
              <Link to="/personal-data-consent">
                Согласие на обработку ПДн
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}