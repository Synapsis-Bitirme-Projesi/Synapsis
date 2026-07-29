# Contributing to Synapsis

Thanks for helping improve Synapsis. This guide keeps the three-person team (and future contributors) aligned.

## Team and ownership
| Area | Primary owner |
|------|----------------|
| /backend - API, DB schema, auth, AI, cron, sockets | **Ahmet Tolga Kucuk** |
| /frontend app shell, dashboard, calendar/schedule, assistant, whiteboard | **Yunus Emre Durak** |
| /frontend tasks, notes UX, exams, shared widgets/polish | **Nazif Tosun** |

If you need to change another person's area, coordinate first (group chat or PR comment) before large edits.

## Branch naming
- eat/<short-description> - new feature  
- ix/<short-description> - bug fix  
- chore/<short-description> - tooling, config, docs  

Examples: eat/auth-login, ix/calendar-display, chore/update-deps

## Rules
- No direct push to main - always branch and open a PR  
- At least **1 review** required before merge  
- Do not rewrite another owner's module without coordinating  
- Never commit secrets (.env, API keys, DB passwords)  
- Prefer conventional commits (below)

## Commit style (Conventional Commits)
`
feat: add login form validation
fix: correct task priority sorting
chore: update .gitignore
docs: update CONTRIBUTING.md
test: cover note-course linking API
`

## Pull request workflow
1. Branch off main: git checkout -b feat/your-feature
2. Commit with conventional commits
3. Push and open a PR on GitHub
4. Request review from at least one teammate (Ahmet, Yunus, or Nazif)
5. Merge only after approval - no self-merges on shared main

### PR checklist
- [ ] Change is scoped and described  
- [ ] Backend behavior changes include or update ackend/tests when practical  
- [ ] Env vars documented in the matching .env.example  
- [ ] Docs updated if user-facing behavior or setup changed (README.md, PROGRESS.md, TASKS.md)

## Local development
`ash
# Backend
cd backend
npm install
cp .env.example .env   # fill values
npm run dev            # http://localhost:5000
npm test

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
`

See [README.md](README.md) for stack overview and [PROGRESS.md](PROGRESS.md) for final delivery status.

## Code guidelines
- **Backend:** Express routers under ackend/src/routes, shared DB pool in config/db.js, auth via JWT middleware  
- **Frontend:** Next.js App Router under rontend/app; API base URL from rontend/app/lib/api.ts  
- Keep UI copy in **English**  
- Preserve dark-mode-friendly styles when adding UI  
- Prefer small, reviewable PRs over long-lived mega-branches  

## Reporting issues
Open a GitHub issue with:
1. What you expected  
2. What happened  
3. Steps to reproduce  
4. Environment (OS, browser, local vs deployed)  

## License
By contributing, you agree that your contributions are licensed under the same MIT license as the project.
