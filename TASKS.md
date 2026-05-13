# Synapsis — Task Board

Status: `todo` | `in-progress` | `done`

---

## Phase 1 — Foundation (Sprint 1-2)
> DB schema, user auth, UI/UX wireframes

| Task                                               | Owner      | Status |
|----------------------------------------------------|------------|--------|
| Design DB schema (users, courses, tasks, notes)    | Teammate A | done   |
| Set up PostgreSQL + backend project structure      | Teammate A | done   |
| Implement user auth (register/login + JWT)         | Teammate A | done   |
| Set up Next.js + Tailwind project structure        | Teammate B | done   |
| Create wireframes for Dashboard layout             | Teammate B | done   |
| Create wireframes for Tasks and Notes views        | Teammate C | done   |

---

## Phase 2 — Dashboard (Sprint 3-4)
> Epic 1: User Profile & Customizable Dashboard

| Task                                               | Owner      | Status |
|----------------------------------------------------|------------|--------|
| Auth API endpoints (register, login, profile)      | Teammate A | done   |
| Dashboard layout + widget container                | Teammate B | done   |
| Weekly schedule widget                             | Teammate B | done   |
| Upcoming Deadlines and Urgent Tasks widgets        | Teammate C | done   |
| Dynamic classes-today count from course schedule  | Teammate C | done   |

---

## Phase 3 — Calendar & Scheduler (Sprint 5-6)
> Epic 2: Academic Scheduler & Calendar

| Task                                               | Owner      | Status |
|----------------------------------------------------|------------|--------|
| Course schedule API endpoints (CRUD)               | Teammate A | done   |
| Exam API endpoints (CRUD)                          | Teammate A | done   |
| Weekly course schedule creator UI                  | Teammate B | done   |
| Monthly calendar view UI                           | Teammate B | done   |
| Calendar shows exams + tasks with due dates        | Teammate B | done   |
| Click exam on calendar to edit/delete              | Teammate B | done   |

---

## Phase 4 — Tasks & Notes (Sprint 7-8)
> Epic 3: Task Management · Epic 4: Notes System

| Task                                               | Owner      | Status |
|----------------------------------------------------|------------|--------|
| Task API endpoints (CRUD, priority, course tag)    | Teammate A | done   |
| Task type field + full edit endpoint               | Teammate A | done   |
| Notes API endpoints (CRUD)                         | Teammate A | done   |
| Task form with Type select and dynamic course dropdown | Teammate C | done |
| Task edit modal (pencil icon, pre-filled)          | Teammate C | done   |
| Overdue badge for past-due incomplete tasks        | Teammate C | done   |
| Note editor UI (Tiptap, auto-save, slash commands) | Teammate C | done   |

---

## Phase 5 — Testing & Polish (Sprint 9-10)

| Task                                               | Owner      | Status      |
|----------------------------------------------------|------------|-------------|
| Course edit/delete UI + backend auth fix           | All        | done        |
| Exam edit/delete via calendar click                | All        | done        |
| Auth flow fixes (logout modal, auth flash, theme flash) | All   | done        |
| Public landing page at `/`                         | Teammate B | done        |
| All UI text translated to English                  | All        | done        |
| Dark mode consistency across all pages             | All        | done        |
| Priority badge and date display bug fixes          | All        | done        |
| Bug fixing and cross-module code review            | All        | done        |
| Responsive design (desktop/tablet/mobile)          | Teammate B | in-progress |
| Usability testing (target SUS score ≥75)           | Teammate C | todo        |
| Deployment setup + final documentation             | Teammate A | todo        |
