# Class — project instructions for Claude Code

## Project
Class is an application for tutors.
Core entities and flows:
- students
- lessons
- payments
- homework
- reminders/notifications

Primary goal: build a stable MVP first, not an ever-growing pile of features.

## Development priorities
Work in this order:
1. stable startup and local run
2. auth/session
3. students CRUD
4. lessons CRUD and dashboard
5. payments and homework
6. notifications
7. integrations and advanced features later

## Working mode
- bash-first
- gather context before editing
- prove the problem with commands/logs/output first
- then propose the smallest possible patch
- after every patch, always show:
  - `git diff`
  - a verification step (`curl`, tests, logs, or service check)

## Constraints
- do not fix things based on guesses
- do not sprawl across unrelated parts of the project
- do not mix infra, backend, and frontend changes in one commit unless absolutely necessary
- if the environment is broken, fix the environment before changing code
- do not open a PR from a dirty feature branch if the confirmed fix can be isolated into a clean branch from `origin/main`

## Definition of Done
A task is done only if:
- the problem was demonstrated with evidence
- the patch is minimal
- the change was verified by running code / curl / tests
- there is no traceback in logs for the fixed path
- `git status` is clean
- there is a dedicated commit

## Commit rules
- confirmed fixes get separate commits
- unverified work should be committed only as `wip`
- commit messages must be short and specific

## Branch rules
- when possible, move a confirmed local fix into a clean branch from `origin/main`
- do not drag unrelated changes into one PR

## Required post-change routine
After each important change, the agent must:
1. show `git diff`
2. show verification output
3. only then suggest a commit

## Communication style
- concise and direct
- do not say "should work" if it was not verified
- do not present assumptions as confirmed facts