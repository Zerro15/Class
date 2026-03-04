# ClassFlow API

Базовый префикс: `/api/v1`

## Авторизация
| Метод | Endpoint | Описание |
| --- | --- | --- |
| POST | /auth/register | Регистрация и выдача access token |
| POST | /auth/login | Логин и выдача access token |
| GET | /auth/me | Текущий пользователь |

## Ученики
| Метод | Endpoint | Описание |
| --- | --- | --- |
| GET | /students | Список учеников |
| POST | /students | Создать ученика |
| GET | /students/{id} | Карточка ученика |
| PATCH | /students/{id} | Обновить ученика |
| DELETE | /students/{id} | Удалить ученика |
| GET | /students/{id}/lessons | Список занятий ученика |
| POST | /students/{id}/lessons | Создать занятие ученика (опционально домашка/оплата) |
| GET | /students/{id}/balance | Баланс ученика (начислено/оплачено/долг) |

## Занятия
Поддерживаемые статусы занятия:
- `scheduled` — запланирован
- `rescheduled` — перенесён
- `completed` — проведён
- `canceled` — отменён
- `no_show` — неявка

| Метод | Endpoint | Описание |
| --- | --- | --- |
| GET | /lessons | Список занятий, фильтр `from`/`to` |
| GET | /lessons/{id} | Карточка занятия |
| POST | /lessons | Создать занятие |
| PATCH | /lessons/{id} | Обновить поля занятия и статус |
| DELETE | /lessons/{id} | Удалить занятие |
| POST | /lessons/{id}/reschedule | Перенести занятие + причина + notify |

## Домашка
Статусы домашки:
- `assigned` — задано
- `submitted` — отправлено
- `reviewed` — проверено

| Метод | Endpoint | Описание |
| --- | --- | --- |
| POST | /lessons/{id}/homework | Создать домашку |
| PATCH | /lessons/{id}/homework | Обновить домашку |
| POST | /lessons/{id}/homework/done | Отметить домашку как проверенную |

## Оплаты
Статусы оплаты:
- `unpaid` — не оплачено
- `partial` — частично
- `paid` — оплачено

| Метод | Endpoint | Описание |
| --- | --- | --- |
| POST | /lessons/{id}/payment | Создать запись оплаты урока |
| PATCH | /lessons/{id}/payment | Обновить запись оплаты |
| POST | /lessons/{id}/payment/paid | Быстро отметить оплату как полную |
| POST | /payments | Создать транзакцию оплаты (нал/перевод/карта, комментарий) |

## Дашборд
| Метод | Endpoint | Описание |
| --- | --- | --- |
| GET | /dashboard/upcoming | Ближайшие занятия (только scheduled/rescheduled) |
| GET | /dashboard/history | История занятий (limit + status) |

## Служебное
| Метод | Endpoint | Описание |
| --- | --- | --- |
| GET | /health | Проверка сервиса |
