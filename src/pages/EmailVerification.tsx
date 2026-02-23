export default function EmailVerification() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-foreground">
        Верификация почты и пароль приложения (SMTP)
      </h1>

      <div className="mt-6 space-y-5 text-sm text-muted-foreground leading-relaxed">
        <p>
          Чтобы SmartOffer мог отправлять письма от имени вашей корпоративной
          почты, используется пароль приложения.
          <br />
          Это безопаснее основного пароля: пароль приложения можно отозвать в
          любой момент у провайдера.
        </p>

        <h2 className="text-base font-semibold text-foreground">
          Быстрый алгоритм (универсальный)
        </h2>

        <div className="space-y-4">
          <div>
            <div className="text-foreground font-semibold">
              Шаг 1 - зайдите в настройки. Выберите своего провайдера. Сервис
              предложит вам ссылку на инструкцию, как сгенерировать пароль для
              приложений на вашем провайдере.
            </div>
          </div>

          <div>
            <div className="text-foreground font-semibold">
              Шаг 2 — включите двухфакторную аутентификации на почте.
            </div>
            <div>
              Пароль приложения почти всегда доступен только после включения
              двухфакторной аутентификации.
            </div>
          </div>

          <div>
            <div className="text-foreground font-semibold">
              Шаг 3 — создайте «пароль приложения» следуя инструкции на странице
              провайдера.
            </div>
            <div>
              В настройках безопасности почты найдите “Пароли приложений” →
              создайте новый пароль для “Почта/SMTP”.
            </div>
          </div>

          <div>
            <div className="text-foreground font-semibold">
              Шаг 4 — вставьте полученный пароль в SmartOffer.
            </div>
            <div>
              Настройки → Почта (SMTP):
              <br />
              Email → Провайдер → Пароль приложения → Сохранить.
            </div>
          </div>
        </div>

        <h2 className="text-base font-semibold text-foreground">
          Частые причины ошибок подключения:
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            двухфакторная аутентификация не включена → пароль приложения
            недоступен;
          </li>
          <li>пароль приложения вставлен с пробелом;</li>
          <li>
            провайдер блокирует SMTP в организации (редко, но бывает).
          </li>
        </ul>

        <h2 className="text-base font-semibold text-foreground">Безопасность:</h2>
        <p>
          SmartOffer не просит ваш основной пароль от почты, используется
          отдельный пароль приложения. Пароль можно отозвать у провайдера за 30
          секунд.
        </p>

        <p className="text-foreground font-semibold">
          Если не получилось — напишите в поддержку: info@smartoffer.pro
        </p>
      </div>
    </main>
  );
}