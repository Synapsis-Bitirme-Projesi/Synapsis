# CLAUDE.md — Rules for Claude Code Sessions

## Scope
- Base all work strictly on the SOW and the current phase in PROGRESS.md
- Do not invent features outside the 4 MVP epics (Dashboard, Calendar, Tasks, Notes)
- AI assistant is explicitly post-MVP — do not add it to any MVP module or endpoint

## Code Discipline
- Do not write application code unless the current phase in PROGRESS.md requires it
- Do not refactor files unrelated to the current task
- Do not add dependencies without asking the user first
- Keep changes small and PR-reviewable (one concern per session)

## Workflow
- Plan before implementing: present the approach, wait for approval
- Respect file ownership from CONTRIBUTING.md when editing files
- Update PROGRESS.md and TASKS.md status after completing work

## Do Not
- Modify README.md unless explicitly asked
- Add AI, ML, or external API integrations to MVP code
- Combine multiple unrelated changes in one session
- Push or open PRs without explicit user instruction
