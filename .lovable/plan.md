

## План: Supabase + Auth + Admin Dashboard + Voice UI

Подключаем Lovable Cloud (Supabase под капотом — без ручных ключей и `.env`), добавляем аутентификацию с разделением ролей, защищённые маршруты, админ-панель с метриками и графиками, и UI для голосового ввода в чате.

---

### 1. Подключение Lovable Cloud (Supabase)

Вместо ручной настройки `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` включаем **Lovable Cloud** — он автоматически:
- создаёт Supabase проект,
- генерирует клиент `src/integrations/supabase/client.ts`,
- настраивает env-переменные,
- даёт типизацию таблиц.

Если предпочитаешь подключить свой внешний Supabase — скажи, и сделаем classic-интеграцию с `.env`.

---

### 2. Схема БД (создаётся миграцией автоматически)

**`profiles`** — данные пользователя (1:1 с `auth.users`)
- `id` uuid PK → `auth.users(id)` ON DELETE CASCADE
- `email` text
- `full_name` text
- `created_at` timestamptz

**`user_roles`** — роли (отдельная таблица, чтобы избежать privilege escalation)
- `id` uuid PK
- `user_id` uuid → `auth.users(id)`
- `role` app_role enum (`admin`, `client`, `lawyer`)
- UNIQUE (user_id, role)

**Enum** `app_role`: `admin | client | lawyer`

**Security Definer функция** `has_role(_user_id, _role)` — для безопасных RLS-проверок без рекурсии.

**Триггер** `handle_new_user()` — автоматически создаёт запись в `profiles` и присваивает роль `client` при регистрации.

**RLS политики:**
- `profiles`: пользователь читает/обновляет только свой профиль; админ читает все.
- `user_roles`: только админ может назначать роли; пользователь читает свои роли.

---

### 3. Auth Flow

**Страницы:**
- `/auth` — единая страница с табами **Вход / Регистрация** (минималистично, в стиле Apple).
  - Email + пароль
  - Кнопка "Продолжить" (electric blue)
  - Линк "Забыли пароль?"
- Используем `supabase.auth.signUp` / `signInWithPassword`.
- На signup — `emailRedirectTo: window.location.origin`.

**Хук `useAuth`** (`src/hooks/useAuth.tsx`):
- Контекст с `user`, `session`, `role`, `loading`.
- Подписка через `onAuthStateChange` **до** `getSession()`.
- Функция `signOut()`.

**`<ProtectedRoute requiredRole?>`:**
- Не залогинен → редирект на `/auth`.
- Роль `admin` → доступ к `/admin/*`.
- Роль `client` → доступ к `/` (чат).
- После логина: redirect по роли (`admin → /admin`, иначе → `/`).

---

### 4. Admin Dashboard (`/admin`)

**Layout:** Shadcn Sidebar (`collapsible="icon"`) + хедер с `SidebarTrigger` и кнопкой "Выйти".

**Навигация в сайдбаре:**
- 📊 Обзор → `/admin`
- 👥 Пользователи → `/admin/users`
- 📁 Дела → `/admin/cases`

**Overview (`/admin`):**
- Сетка из 4 метрик-карточек:
  - Всего пользователей
  - Активные чаты
  - Продано лидов
  - Выручка (₽)
- Каждая карточка: иконка + значение + дельта за неделю.
- Данные через хук `useMetrics()` — сейчас возвращает заглушки, но структурирован под `supabase.from('...').select(...)` (комментарии-плейсхолдеры внутри).

**Графики (recharts):**
- **Funnel chart** — горизонтальные бары: Registered → Chat Started → PDF Bought → Lead Sold.
- **Category split** — pie/donut chart по категориям (ДТП, Развод, Залив, Прочее).

**Users / Cases страницы:** заглушки-таблицы с колонками и пустым состоянием — готовы под реальные запросы.

---

### 5. Voice Input UI на экране чата

В `ChatInterface.tsx`, рядом с текстовым полем, добавляем кнопку с иконкой `Mic`:
- **Default:** серая иконка, hover → primary.
- **Recording:** заливка electric blue + анимация `pulse-subtle` (уже есть в tailwind config) + красная точка-индикатор.
- Состояние `isRecording` через `useState`.
- Клик переключает состояние (реальная запись / Whisper API — в следующей итерации).

---

### 6. Роутинг (App.tsx)

```text
/                  → ProtectedRoute(client)  → Index (лендинг/чат)
/auth              → AuthPage
/admin             → ProtectedRoute(admin)  → AdminLayout → Overview
/admin/users       → AdminLayout → Users
/admin/cases       → AdminLayout → Cases
*                  → NotFound
```

---

### Технические детали

- **Файлы создаваемые:**
  - `src/pages/Auth.tsx`
  - `src/pages/admin/AdminLayout.tsx`
  - `src/pages/admin/Overview.tsx`
  - `src/pages/admin/Users.tsx`
  - `src/pages/admin/Cases.tsx`
  - `src/components/admin/AppSidebar.tsx`
  - `src/components/admin/MetricCard.tsx`
  - `src/components/admin/FunnelChart.tsx`
  - `src/components/admin/CategoryChart.tsx`
  - `src/components/ProtectedRoute.tsx`
  - `src/hooks/useAuth.tsx`
  - `src/hooks/useMetrics.ts`
- **Файлы редактируемые:**
  - `src/App.tsx` — роуты + `AuthProvider`.
  - `src/components/ChatInterface.tsx` — добавить mic-кнопку.
  - `src/index.css` — стили для recording-state (если нужно).
- **Пакет:** `recharts` (для графиков).
- **Миграция БД:** enum + 2 таблицы + функция `has_role` + триггер `handle_new_user` + RLS политики.

---

### Что НЕ входит в этот шаг (можно добавить далее)

- Реальная запись голоса + Whisper STT.
- Подключение n8n webhooks и Gemini.
- Реальные данные в метриках (заменить заглушки на запросы).
- Google/Apple OAuth (легко добавить позже в Lovable Cloud).

