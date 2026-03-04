.PHONY: test lint type check

test:
	python -m pytest

lint:
	python -m ruff check .

type:
	python -m mypy app

check: lint type test
