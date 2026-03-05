<<<<<<< HEAD
# ClassFlow API

Базовый префикс: `/api/v1`

| Метод | Endpoint | Описание |
| --- | --- | --- |
| POST | /auth/register | Регистрация и выдача access token |
| POST | /auth/login | Логин и выдача access token |
| GET | /students | Список учеников пользователя |
| POST | /students | Создание ученика |
| GET | /students/{id} | Получить ученика |
| PATCH | /students/{id} | Обновить ученика |
| DELETE | /students/{id} | Удалить ученика |
| GET | /lessons | Список занятий, фильтр `from`/`to` |
| GET | /lessons/{id} | Карточка занятия |
| POST | /lessons | Создать занятие |
| PATCH | /lessons/{id} | Обновить занятие |
| POST | /lessons/{id}/payment | Создать оплату |
| PATCH | /lessons/{id}/payment | Обновить оплату |
| POST | /lessons/{id}/homework | Создать домашку |
| PATCH | /lessons/{id}/homework | Обновить домашку |
| GET | /dashboard/upcoming | Ближайшие занятия (`days` параметр) |
| GET | /health | Проверка сервиса |
=======
# ClassFlow API

Базовый префикс: `/api/v1`

## Авторизация
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

## Ученики
- `GET /students?q=&include_inactive=` — список учеников с поиском и фильтром активных.
- `POST /students` — создать ученика (`name`, `notes`, `price_per_hour`).
- `GET /students/{id}` — карточка ученика.
- `PATCH /students/{id}` — обновить ученика.
- `DELETE /students/{id}` — soft-delete (архивирование).
- `POST /students/{id}/restore` — восстановить из архива.
- `GET /students/{id}/lessons` — уроки ученика.
- `POST /students/{id}/lessons` — создать урок ученика.
- `GET /students/{id}/balance` — `{charged_total, paid_total, debt}`.

## Занятия
Статусы уроков:
- `scheduled` — запланирован
- `rescheduled` — перенесён
- `completed` — проведён
- `canceled` — отменён
- `no_show` — неявка

Эндпоинты:
- `GET /lessons`
- `GET /lessons/{id}`
- `POST /lessons`
- `PATCH /lessons/{id}`
- `DELETE /lessons/{id}`
- `POST /lessons/{id}/reschedule`

## Домашка
Статусы домашки:
- `assigned` — задано
- `submitted` — отправлено
- `reviewed` — проверено

Эндпоинты:
- `POST /lessons/{id}/homework`
- `PATCH /lessons/{id}/homework`
- `POST /lessons/{id}/homework/done`

## Оплаты и финансы
Статусы оплаты:
- `unpaid` — не оплачено
- `partial` — частично
- `paid` — оплачено

Эндпоинты:
- `POST /lessons/{id}/payment`
- `PATCH /lessons/{id}/payment`
- `POST /lessons/{id}/payment/paid`
- `POST /payments` — создать транзакцию оплаты.
- `GET /finance/summary?month=YYYY-MM` — `{income_month, unpaid_total, payments[]}`.

## Дашборд
- `GET /dashboard/summary` — `{upcoming_count, today_count, unpaid_total}`
- `GET /dashboard/upcoming`
- `GET /dashboard/history`

## Служебное
- `GET /health`
>>>>>>> origin/codex/implement-stable-auth-session-in-ui-559zr8
