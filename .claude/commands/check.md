Run the full pre-commit gate in order and report pass/fail per step with actual output:

1. Typecheck (e.g. `npx tsc --noEmit`, or `mypy`/`ruff` for Python)
2. Lint (zero warnings on production code)
3. Test (full suite)

If anything fails, fix it and re-run until all green before proceeding. Do not commit until this passes clean. Adapt the exact commands to this project's package.json / Makefile / pyproject.toml — don't invent commands that don't exist.
