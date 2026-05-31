import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Search,
  Mail,
  History,
  Shield,
  FileText,
  LifeBuoy,
  KeyRound,
  Settings,
  CheckCircle2,
  ExternalLink,
  Trash2,
} from "lucide-react";

const QUICK_LINKS = [
  {
    title: "Верификация почты",
    description: "Проверка SMTP и подключение почты для отправки RFQ-писем.",
    to: "/email-verification",
    icon: Mail,
  },
  {
    title: "Сброс пароля",
    description: "Восстановление доступа к аккаунту через ссылку на email.",
    to: "/reset-password",
    icon: KeyRound,
  },
  {
    title: "О проекте",
    description: "Кратко о модели сервиса, тарифах и ценности SmartOffer.",
    to: "/about",
    icon: BadgeCheck,
  },
  {
    title: "Условия использования",
    description: "Правила работы с сервисом и допустимые сценарии использования.",
    to: "/terms",
    icon: FileText,
  },
  {
    title: "Политика конфиденциальности",
    description: "Как обрабатываются данные аккаунта, истории и SMTP-настроек.",
    to: "/privacy",
    icon: Shield,
  },
  {
    title: "Согласие на обработку email-данных",
    description: "Условия IMAP-доступа для сохранения ответов поставщиков в истории SmartOffer.",
    to: "/imap-email-sync-consent",
    icon: FileText,
  },
  {
    title: "Публичная оферта",
    description: "Условия предоставления доступа к сервису и оплаты тарифов.",
    to: "/offer",
    icon: BookOpen,
  },
  {
    title: "Политика хранения данных",
    description: "Как SmartOffer определяет сроки хранения и удаления данных.",
    to: "/data-retention",
    icon: Shield,
  },
  {
    title: "Согласие на обработку персональных данных",
    description: "Документ, который подтверждается при сохранении SMTP-настроек.",
    to: "/personal-data-consent",
    icon: FileText,
  },
];

const HELP_SECTIONS = [
  {
    title: "1. Как начать работу",
    icon: CheckCircle2,
    items: [
      "Зарегистрируйте аккаунт или войдите в существующий.",
      "При необходимости подключите рабочую почту через SMTP.",
      "Заполните наименование оборудования, тему письма и текст запроса.",
      "Запустите поиск поставщиков и дождитесь завершения задачи.",
      "Проверьте найденные контакты и отправьте RFQ выбранным адресатам.",
    ],
  },
  {
    title: "2. Как работает поиск",
    icon: Search,
    items: [
      "Поиск запускается как отдельная задача и обрабатывается асинхронно.",
      "Результаты появляются после завершения search job.",
      "Если поиск длится дольше обычного, итог можно проверить в истории.",
      "В выдачу попадают только результаты с найденными email-контактами.",
    ],
  },
  {
    title: "3. Почта и отправка RFQ",
    icon: Mail,
    items: [
      "Отправка писем работает через SMTP-настройки пользователя.",
      "Письма отправляются от имени пользователя, а не от имени платформы.",
      "Перед сохранением SMTP рекомендуется пройти верификацию почты.",
      "Для сохранения SMTP-настроек требуется подтвердить согласие на обработку персональных данных.",
      "Если почтовый провайдер отклоняет письмо, статус ошибки будет отражён в истории.",
    ],
  },
  {
    title: "4. История и контроль статусов",
    icon: History,
    items: [
      "В истории сохраняются поисковые запросы и результаты по job_id.",
      "Для отправленных писем доступны тема, текст и статусы доставки.",
      "Для результатов можно вручную отмечать статус «КП получено».",
      "История — главный источник правды по отправкам и поисковым задачам.",
    ],
  },
  {
    title: "5. Удаление аккаунта",
    icon: Trash2,
    items: [
      "В настройках доступна self-service кнопка удаления аккаунта.",
      "Для удаления требуется повторно подтвердить email аккаунта и ввести пароль.",
      "После удаления аккаунта из активного контура удаляются аккаунт, SMTP-настройки и связанные данные сервиса.",
      "Если нужен отдельный запрос по данным без удаления аккаунта, используй support@smartoffer.pro.",
    ],
  },
 {
    title: "6. Безопасность и доступ",
    icon: Shield,
    items: [
      "Доступ к аккаунту защищён авторизацией по email и паролю.",
      "При утере доступа можно запросить сброс пароля.",
      "SMTP-данные используются только для отправки писем от имени пользователя.",
      "Не передавайте доступ к аккаунту и SMTP третьим лицам без необходимости.",
    ],
  },
];

const FAQ = [
  {
    question: "Почему поиск может выполняться не мгновенно?",
    answer:
      "SmartOffer использует асинхронную модель: сначала создаётся задача поиска, затем интерфейс получает её статус до завершения. Это снижает риск зависаний UI и позволяет корректно обрабатывать длительные запросы.",
  },
  {
    question: "Почему письмо может не отправиться?",
    answer:
      "Обычно причина связана с SMTP-настройками, паролем приложения, ограничениями почтового провайдера или антиспам-фильтрами. Перед рабочей отправкой проверьте почту через страницу верификации.",
  },
  {
    question: "Где смотреть уже отправленные письма?",
    answer:
      "Откройте историю запросов. Там доступны тема письма, текст, статусы по адресам и отметки о полученных коммерческих предложениях.",
  },
  {
    question: "Можно ли удалить аккаунт самостоятельно?",
    answer:
      "Да. В настройках сервиса предусмотрена отдельная кнопка удаления аккаунта с обязательным подтверждением email и пароля.",
  },
{
    question: "Можно ли использовать личную почту?",
    answer:
      "Технически SMTP можно подключить, но для рабочего сценария и бесплатного тарифа рекомендуется корпоративная почта. Это снижает риск блокировок и повышает доверие получателей.",
  },
];

export default function Docs() {
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
              SmartOffer.pro — справка и документы
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
                Справка и документы SmartOffer
              </h1>

              <p className="text-muted-foreground leading-relaxed max-w-3xl">
                На этой странице собраны основные инструкции по работе с сервисом,
                быстрые переходы к юридическим документам и ответы на частые вопросы
                по поиску поставщиков, SMTP, истории отправок и удалению аккаунта.
              </p>
            </div>

            <div className="text-xs text-muted-foreground">
              Актуальная справка для текущего интерфейса SmartOffer
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Search className="w-4 h-4" />
              Поиск поставщиков
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Запросы обрабатываются как отдельные задачи, а результат выдаётся
              после завершения поиска и обработки контактов.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Mail className="w-4 h-4" />
              SMTP и письма
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              RFQ-письма отправляются через почту пользователя, поэтому корректная
              настройка SMTP — ключевой шаг перед массовой работой.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <History className="w-4 h-4" />
              История
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              История помогает контролировать завершённые поиски, отправки писем
              и факт получения коммерческих предложений.
            </p>
          </div>

          <div className="border border-border rounded-2xl bg-card p-5">
            <div className="flex items-center gap-2 text-foreground font-medium mb-2">
              <Trash2 className="w-4 h-4" />
              Удаление аккаунта
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Аккаунт можно удалить через настройки без отдельного ручного запроса.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Быстрые разделы
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to={item.to}
                  className="border border-border rounded-2xl bg-card p-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <Icon className="w-4 h-4" />
                        {item.title}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-10 space-y-4">
          {HELP_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.title}
                className="border border-border rounded-2xl bg-card p-6"
              >
                <div className="flex items-center gap-2 text-foreground font-medium mb-4">
                  <Icon className="w-4 h-4" />
                  {section.title}
                </div>

                <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Частые вопросы
          </h2>

          <div className="space-y-4">
            {FAQ.map((item) => (
              <div
                key={item.question}
                className="border border-border rounded-2xl bg-card p-6"
              >
                <div className="text-foreground font-medium mb-2">
                  {item.question}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <LifeBuoy className="w-4 h-4" />
              Поддержка
            </div>

            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>
                По техническим вопросам:{" "}
                <a href="mailto:support@smartoffer.pro" className="text-primary hover:underline">
                  support@smartoffer.pro
                </a>
              </p>
              <p>
                По общим и бизнес-вопросам:{" "}
                <a href="mailto:info@smartoffer.pro" className="text-primary hover:underline">
                  info@smartoffer.pro
                </a>
              </p>
              <p>
                В обращении желательно указать email аккаунта, краткое описание
                проблемы и шаг, на котором возникла ошибка.
              </p>
            </div>
          </div>

          <div className="border border-border rounded-2xl bg-card p-6">
            <div className="flex items-center gap-2 text-foreground font-medium mb-3">
              <Settings className="w-4 h-4" />
              Что проверить перед началом работы
            </div>

            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
              <li>Заполнены тема письма и текст RFQ.</li>
              <li>Подключена и проверена рабочая почта.</li>
              <li>Используется корректный пароль приложения SMTP.</li>
              <li>Подтверждено согласие на обработку персональных данных для SMTP.</li>
              <li>Запрос сформулирован под одну конкретную потребность.</li>
              <li>После отправки проверяется история и статусы доставки.</li>
            </ul>
          </div>
        </section>

        <section className="mt-12 border border-border rounded-2xl bg-card p-7">
          <h2 className="text-xl font-semibold text-foreground">
            Все ключевые документы и инструкции собраны в одном месте
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
            Эта страница предназначена как единая точка входа в справку SmartOffer:
            отсюда удобно перейти к юридическим документам, настройке почты,
            восстановлению доступа и базовым сценариям работы сервиса.
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