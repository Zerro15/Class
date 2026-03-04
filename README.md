# ClassFlow MVP

ClassFlow — планировщик репетитора: ученики, занятия, переносы, домашка, оплаты, баланс и дашборд.

## Что теперь умеет репетитор
- Вести занятия со статусами: **Запланирован / Перенесён / Проведён / Отменён / Неявка**.
- Переносить занятие с причиной и флагом «уведомить ученика».
- Вести домашку со статусами: **Задано / Отправлено / Проверено**.
- Вносить оплаты транзакциями и видеть баланс ученика (начислено / оплачено / долг).
- Смотреть ближайшие занятия и историю с фильтрами.

## Структура репозитория
```
backend/    FastAPI + SQLAlchemy + Alembic
frontend/   Next.js 14 (App Router) + TypeScript + Tailwind
infra/      инфраструктурные заметки
docs/       спецификация и API
```

## Быстрый старт через Docker Compose
```bash
cp .env.example .env
docker compose up --build
```

После запуска:
- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs

## Локальная разработка backend
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
pytest -q backend/tests
```

Также поддерживается запуск из `backend/`:
```bash
cd backend && pytest -q
```

## Локальная разработка frontend
```bash
cd frontend
pnpm install
pnpm lint
pnpm build
```

## Рекомендуемый workflow
Запускайте backend тесты из корня репозитория:
```bash
pytest -q backend/tests
```

## Переменные окружения
`.env` в корне:
- `DATABASE_URL` — подключение к Postgres
- `JWT_SECRET` — JWT секрет
- `FRONTEND_ORIGIN` — CORS origin фронтенда
- `TAX_PERCENT_DEFAULT` — комиссия/налог по умолчанию
- `NEXT_PUBLIC_API_URL` — URL backend для frontend
- `LOGIN_RATE_LIMIT_ATTEMPTS` — лимит неудачных логинов
- `LOGIN_RATE_LIMIT_WINDOW_SECONDS` — окно лимита логинов

## Полезные ссылки
- [API](docs/API.md)
- [SPEC](docs/SPEC.md)
