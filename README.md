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
- `NEXT_PUBLIC_API_URL` — URL backend для фронтенда

## Команды
Backend (в контейнере `backend`):
- `pytest` — тесты
- `ruff check .` — линтер
- `mypy app` — typecheck

Frontend:
- `npm run lint`
- `npm run typecheck`

## Почему так
- Для MVP токен хранится в `localStorage` (проще и быстрее в реализации). В production можно заменить на httpOnly cookie.

## Документация
- [SPEC](docs/SPEC.md)
- [API](docs/API.md)
