# ClassFlow MVP

ClassFlow — MVP помощника для репетиторов: ученики, занятия, статусы, оплата, домашка и дашборд ближайших занятий.

## Структура репозитория
```
backend/    FastAPI + SQLAlchemy + Alembic
frontend/   Next.js (App Router) + Tailwind + shadcn/ui
infra/      инфраструктурные заметки
docs/       спецификация и краткое API
```

## Быстрый старт через Docker Compose
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

## Рекомендуемый локальный workflow
Запускайте тесты бэкенда из корня репозитория:
```bash
pytest -q backend/tests
```

Также поддерживается запуск из папки `backend/`:
```bash
cd backend && pytest -q
```

## Локальная разработка backend
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
pytest -q backend/tests
```

## Локальная разработка frontend
```bash
cd frontend
pnpm install
pnpm lint
pnpm build
```

## Переменные окружения
`.env` в корне:
- `DATABASE_URL` — строка подключения к Postgres
- `JWT_SECRET` — секрет для JWT
- `FRONTEND_ORIGIN` — origin фронтенда (CORS)
- `TAX_PERCENT_DEFAULT` — налог/комиссия по умолчанию
- `NEXT_PUBLIC_API_URL` — URL backend для фронтенда

## Документация
- [SPEC](docs/SPEC.md)
- [API](docs/API.md)
