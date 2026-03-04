# ClassFlow MVP

ClassFlow — планировщик репетитора: ученики, уроки, переносы, домашка, оплаты и финансы.

## Возможности для репетитора
- Статусы уроков: **Запланирован / Перенесён / Проведён / Отменён / Неявка**.
- Статусы оплаты: **Не оплачено / Частично / Оплачено**.
- Баланс ученика: **Начислено / Оплачено / Долг**.
- Дашборд с карточками: предстоящие, сегодня, неоплаченная сумма.
- Финансы: доходы за месяц, неоплаченные уроки, таблица платежей.

## Запуск через Docker
```bash
cp .env.example .env
docker compose up --build
```

Откройте:
- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs

## Локальная разработка backend
```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
pytest -q backend/tests
```

Также работает запуск из папки `backend`:
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
1. Из корня репозитория запускать backend тесты:
```bash
pytest -q backend/tests
```
2. Перед коммитом проверить frontend:
```bash
cd frontend && pnpm lint && pnpm build
```

## Переменные окружения
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_ORIGIN`
- `TAX_PERCENT_DEFAULT`
- `NEXT_PUBLIC_API_URL`
- `LOGIN_RATE_LIMIT_ATTEMPTS`
- `LOGIN_RATE_LIMIT_WINDOW_SECONDS`
- `CHARGE_ON_NO_SHOW` — учитывать ли неявку в начислениях (по умолчанию `false`)

## Документация
- [docs/API.md](docs/API.md)
- [docs/SPEC.md](docs/SPEC.md)
