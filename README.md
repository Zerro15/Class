# ClassFlow MVP

ClassFlow — MVP помощника для репетиторов: ученики, занятия, статусы, оплата, домашка и дашборд ближайших занятий.

## Структура репозитория
```
backend/    FastAPI + SQLAlchemy + Alembic
frontend/   Next.js (App Router) + Tailwind + shadcn/ui
infra/      инфраструктурные заметки
docs/       спецификация и краткое API
```

## Быстрый старт

1. Скопируйте пример переменных окружения:
   ```bash
   cp .env.example .env
   ```
2. Запустите сервисы:
   ```bash
   docker compose up --build
   ```

После запуска:
- Backend: http://localhost:8000/docs
- Frontend: http://localhost:3000

## Переменные окружения
`.env` в корне:
- `DATABASE_URL` — строка подключения к Postgres
- `JWT_SECRET` — секрет для JWT
- `FRONTEND_ORIGIN` — origin фронтенда (CORS)
- `TAX_PERCENT_DEFAULT` — налог/комиссия по умолчанию
- `NEXT_PUBLIC_API_URL` — публичный URL backend для браузера
- `API_INTERNAL_URL` — внутренний URL backend для SSR внутри docker-сети
- `NEXT_PUBLIC_ADMIN_EMAIL` — email для быстрого входа админом (опционально)
- `NEXT_PUBLIC_ADMIN_PASSWORD` — пароль для быстрого входа админом (опционально)

Для docker-compose `.env.local` не требуется — значения можно задать в `.env`.
Для локального `next dev` удобнее хранить публичные переменные в `frontend/.env.local`.

## Команды
Backend (в контейнере `backend`):
- `pytest` — тесты
- `ruff check .` — линтер
- `mypy app` — typecheck

Frontend:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Рекомендуемый порядок в CI:
1) `npm run lint`
2) `npm run typecheck`
3) `npm run test`
4) `npm run build`

## Почему так
- Для MVP токен хранится в `localStorage` (проще и быстрее в реализации). В production можно заменить на httpOnly cookie.
- `NEXT_PUBLIC_API_URL` используется в браузере, потому что запросы идут из клиентского origin и должны учитывать CORS/host.
- `API_INTERNAL_URL` используется на сервере/SSR, чтобы ходить по внутренней docker-сети напрямую (например `http://backend:8000`).

## Документация
- [SPEC](docs/SPEC.md)
- [API](docs/API.md)
