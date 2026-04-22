import { ArrowLeft, Scale } from "lucide-react";
import { Link } from "react-router-dom";

const Privacy = () => {
  return (
    <div className="mx-auto min-h-screen w-full max-w-app bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold text-foreground">Политика конфиденциальности</p>
        </div>
      </header>

      <main className="px-5 py-6 space-y-5 text-sm leading-relaxed text-foreground">
        <h1 className="text-xl font-bold">Политика конфиденциальности LexTriage</h1>
        <p className="text-muted-foreground text-xs">Версия v1.0</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. Какие данные мы обрабатываем</h2>
          <p className="text-muted-foreground">
            Описание вашей ситуации, ответы на уточняющие вопросы ИИ, контактные данные
            (телефон или Telegram), которые вы оставляете при заявке на связь с юристом.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. Зачем это нужно</h2>
          <p className="text-muted-foreground">
            Чтобы ИИ-ассистент мог дать базовые информационные рекомендации,
            сформировать структурированное досье по вашей ситуации и при вашем согласии
            передать дело профильному юристу.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. Передача юристу</h2>
          <p className="text-muted-foreground">
            Ваши контакты и досье передаются юристу <span className="font-medium text-foreground">только</span>
            после вашего отдельного явного согласия в форме «Передача дела».
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. Право на удаление</h2>
          <p className="text-muted-foreground">
            Вы можете в любой момент запросить удаление ваших данных, написав на support@lextriage.app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. Ограничения ИИ</h2>
          <p className="text-muted-foreground">
            LexTriage предоставляет базовые информационные рекомендации и
            <span className="font-medium text-foreground"> не заменяет очную консультацию адвоката</span>.
            Для принятия юридически значимых решений обратитесь к профильному специалисту.
          </p>
        </section>
      </main>
    </div>
  );
};

export default Privacy;
