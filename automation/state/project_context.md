# ClassFlow operational context

Backend: FastAPI + SQLAlchemy + PyJWT
Frontend: отдельный frontend каталог
Текущий фокус:
- auth/me
- JWT flow
- security hardening
- students/lessons/payments/homework частично готовы

Правило:
1. Architect делает план.
2. Coder предлагает конкретные изменения только по реальной структуре файлов.
3. Tester проверяет риски и тест-кейсы.
4. Изменения в код вносятся локально bash-скриптами/patch, а не руками в UI.
