# Contributing to Synapsis

## Branch Naming
- `feat/<short-description>` — new feature
- `fix/<short-description>` — bug fix
- `chore/<short-description>` — tooling, config, docs

Examples: `feat/auth-login`, `fix/calendar-display`, `chore/update-deps`

## Rules
- No direct push to `main` — always branch and open a PR
- 1 review required before merging any PR
- Do not edit another teammate's module files without coordinating first

## Commit Style (Conventional Commits)
```
feat: add login form validation
fix: correct task priority sorting
chore: update .gitignore
docs: update CONTRIBUTING.md
```

## Pull Request Workflow
1. Branch off `main`: `git checkout -b feat/your-feature`
2. Commit with conventional commits
3. Push and open a PR on GitHub
4. Request review from at least 1 teammate
5. Merge only after approval — no self-merges

## File Ownership (to avoid conflicts)
| Area                                          | Owner      |
|-----------------------------------------------|------------|
| `/backend` — API, DB schema, auth             | Teammate A |
| `/frontend/dashboard`, `/frontend/calendar`   | Teammate B |
| `/frontend/tasks`, `/frontend/notes`, shared  | Teammate C |

If you need to touch another area, coordinate in the group chat first.
