import { Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@ui/button';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-12">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Инструмент */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Инструмент</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Автоматизация поиска поставщиков и отправки запросов коммерческих предложений
            </p>
            <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
              О проекте
            </Button>
          </div>

          {/* Быстрые ссылки */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Быстрые ссылки</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-primary hover:underline text-sm">Поддержка</a>
              </li>
              <li>
                <a href="#" className="text-primary hover:underline text-sm">Цены</a>
              </li>
              <li>
                <a href="#" className="text-primary hover:underline text-sm">Блог</a>
              </li>
            </ul>
          </div>

          {/* Полезное */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Полезное</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Условия использования</a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Политика конфиденциальности</a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground text-sm">Справка и документы</a>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Контакты</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                info@smartoffer.pro
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                +7 (999) 2131 015
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>195027, СПб, ул. Магнитогорская,<br />д. 51, лит. Е</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
