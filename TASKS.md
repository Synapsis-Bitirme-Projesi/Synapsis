# Synapsis - Task Board (Final)

Status: 	odo | in-progress | done

**Team**
| Name | Primary ownership |
|------|-------------------|
| **Ahmet Tolga Kucuk** | Backend, DB, auth, AI APIs, deploy prep |
| **Yunus Emre Durak** | Frontend shell, dashboard, calendar/schedule, assistant UI, whiteboard |
| **Nazif Tosun** | Tasks, notes UX, exams, dashboard widgets, shared polish |

---

## Phase 1 - Foundation (Sprint 1-2)
> DB schema, user auth, UI/UX wireframes

| Task                                            | Owner              | Status |
|-------------------------------------------------|--------------------|--------|
| Design DB schema (users, courses, tasks, notes) | Ahmet Tolga Kucuk  | done   |
| Set up PostgreSQL + backend project structure   | Ahmet Tolga Kucuk  | done   |
| Implement user auth (register/login + JWT)      | Ahmet Tolga Kucuk  | done   |
| Set up Next.js + Tailwind project structure     | Yunus Emre Durak   | done   |
| Create wireframes for Dashboard layout          | Yunus Emre Durak   | done   |
| Create wireframes for Tasks and Notes views     | Nazif Tosun        | done   |

---

## Phase 2 - Dashboard (Sprint 3-4)
> Epic 1: User Profile and Customizable Dashboard

| Task                                              | Owner              | Status |
|---------------------------------------------------|--------------------|--------|
| Auth API endpoints (register, login, profile)     | Ahmet Tolga Kucuk  | done   |
| Dashboard layout + widget container               | Yunus Emre Durak   | done   |
| Weekly schedule widget                            | Yunus Emre Durak   | done   |
| Upcoming Deadlines and Urgent Tasks widgets       | Nazif Tosun        | done   |
| Dynamic classes-today count from course schedule  | Nazif Tosun        | done   |

---

## Phase 3 - Calendar and Scheduler (Sprint 5-6)
> Epic 2: Academic Scheduler and Calendar

| Task                                            | Owner              | Status |
|-------------------------------------------------|--------------------|--------|
| Course schedule API endpoints (CRUD)            | Ahmet Tolga Kucuk  | done   |
| Exam API endpoints (CRUD)                       | Ahmet Tolga Kucuk  | done   |
| Weekly course schedule creator UI               | Yunus Emre Durak   | done   |
| Monthly calendar view UI                        | Yunus Emre Durak   | done   |
| Calendar shows exams + tasks with due dates     | Yunus Emre Durak   | done   |
| Click exam on calendar to edit/delete           | Yunus Emre Durak   | done   |
| Overlapping course side-by-side grid rendering  | Yunus Emre Durak   | done   |

---

## Phase 4 - Tasks and Notes (Sprint 7-8)
> Epic 3: Task Management · Epic 4: Notes System

| Task                                                   | Owner              | Status |
|--------------------------------------------------------|--------------------|--------|
| Task API endpoints (CRUD, priority, course tag)        | Ahmet Tolga Kucuk  | done   |
| Task type field + full edit endpoint                   | Ahmet Tolga Kucuk  | done   |
| Notes API endpoints (CRUD)                             | Ahmet Tolga Kucuk  | done   |
| Task form with Type select and dynamic course dropdown | Nazif Tosun        | done   |
| Task edit modal (pencil icon, pre-filled)              | Nazif Tosun        | done   |
| Overdue badge for past-due incomplete tasks            | Nazif Tosun        | done   |
| Note editor UI (Tiptap, auto-save, slash commands)     | Nazif Tosun        | done   |
| Note-course linking (API + confirm UI)                 | Ahmet Tolga Kucuk / Yunus Emre Durak | done |
| Whiteboard notes mode + AI text export                 | Yunus Emre Durak   | done   |

---

## Phase 5 - AI and Collaboration (Post-MVP)
> Study assistant, community, reminders

| Task                                                      | Owner                         | Status |
|-----------------------------------------------------------|-------------------------------|--------|
| AI Study Assistant backend (context, streaming, artifacts)| Ahmet Tolga Kucuk             | done   |
| Study Buddy page + AssistantPanel UI                      | Yunus Emre Durak              | done   |
| AI study prefs, citations, study-set cache                | Ahmet Tolga Kucuk / Yunus Emre Durak | done |
| Markdown / LaTeX rendering for AI replies                 | Yunus Emre Durak              | done   |
| Community feed + DMs (Socket.IO)                          | Ahmet Tolga Kucuk / team      | done   |
| Email registration verification                           | Ahmet Tolga Kucuk             | done   |
| Task reminder cron emails                                 | Ahmet Tolga Kucuk             | done   |

---

## Phase 6 - Testing and Polish (Sprint 9-10)

| Task                                                    | Owner              | Status |
|---------------------------------------------------------|--------------------|--------|
| Course edit/delete UI + backend auth fix                | All                | done   |
| Exam edit/delete via calendar click                     | All                | done   |
| Auth flow fixes (logout modal, auth flash, theme flash) | All                | done   |
| Public landing page at /                              | Yunus Emre Durak   | done   |
| All UI text translated to English                       | All                | done   |
| Dark mode consistency across all pages                  | All                | done   |
| Priority badge and date display bug fixes               | All                | done   |
| Bug fixing and cross-module code review                 | All                | done   |
| API tests (notes-course linking, AI generation)         | Ahmet Tolga Kucuk  | done   |
| Schedule overlap unit tests                             | Yunus Emre Durak   | done   |
| Loading / empty / error states polish                   | All                | done   |
| Mobile-friendly sidebar toggle, collapse, scroll        | Yunus Emre Durak   | done   |
| Responsive design (desktop/tablet/mobile)               | Yunus Emre Durak   | done*  |
| Deployment prep (env examples, CORS, API base URL)      | Ahmet Tolga Kucuk  | done   |
| Final documentation (README, PROGRESS, TASKS, CONTRIBUTING) | All            | done   |
| Usability testing (target SUS score >= 75)              | Nazif Tosun        | todo   |

* Desktop and improved mobile nav are in place; full visual QA on physical devices (dense weekly grid, whiteboard gestures) remains a recommended follow-up.

---

## Open Follow-ups (optional post-delivery)
| Task | Owner | Status |
|------|-------|--------|
| Formal SUS usability sessions with real students | Nazif Tosun | todo |
| Production secrets + Vercel/Render go-live | Ahmet Tolga Kucuk | todo |
| Touch/pinch whiteboard + compact mobile week view | Yunus Emre Durak | todo |
