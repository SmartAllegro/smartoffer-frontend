import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 mt-16">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Инструмент
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Автоматизация поиска поставщиков и отправки запросов коммерческих
              предложений.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Быстрые ссылки
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#support"
                  className="text-muted-foreground hover:text-primary"
                >
                  Поддержка
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-muted-foreground hover:text-primary"
                >
                  Цены
                </a>
              </li>
              <li>
                <Link
                  to="/email-verification"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  Верификация почты
                </Link>
              </li>
            </ul>

            {/* ✅ Компактная кнопка */}
            <div className="mt-4">
              <Button
                asChild
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 w-auto"
              >
                <Link to="/about">О проекте</Link>
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Полезное
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#terms"
                  className="text-muted-foreground hover:text-primary"
                >
                  Условия использования
                </a>
              </li>
              <li>
                <a
                  href="#privacy"
                  className="text-muted-foreground hover:text-primary"
                >
                  Политика конфиденциальности
                </a>
              </li>
              <li>
                <a
                  href="#docs"
                  className="text-muted-foreground hover:text-primary"
                >
                  Справка и документы
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Контакты
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                info@smartoffer.pro
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                +7 (999) 2131 015
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5" />
                195027, г. Санкт-Петербург,<br />
                ул. Магнитогорская, д. 51, лит. Е
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground">
          © {new Date().getFullYear()} SmartOffer. Все права защищены.
        </div>
      </div>
    </footer>
  );
}