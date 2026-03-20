# auth/me hardening result

Изменения:
- backend/app/api/deps.py
- backend/tests/test_auth.py

Что сделано:
- усилена валидация JWT в get_current_user
- добавлена явная проверка отсутствующего sub
- добавлена защита от нечислового user id в token payload
- добавлен тест на токен без sub

Проверки:
- PYTHONPATH=. pytest -q tests/test_auth.py -> passed
- PYTHONPATH=. pytest -q tests/test_students_lessons.py tests/test_finance.py tests/test_lesson_series.py -> passed

Замечания:
- остались warnings по pydantic class Config
- остались warnings по datetime.utcnow()
- pytest cache warning связан с правами на .pytest_cache
