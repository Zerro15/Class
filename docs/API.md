# ClassFlow API

Базовый префикс: `/api/v1`

| Метод | Endpoint | Описание |
| --- | --- | --- |
| POST | /auth/register | Регистрация и выдача access token |
| POST | /auth/login | Логин и выдача access token |
| GET | /auth/me | Текущий пользователь по Bearer токену |
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
