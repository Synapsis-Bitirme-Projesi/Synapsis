# Synapsis

[![GitHub Repo stars](https://img.shields.io/github/stars/Synapsis-Bitirme-Projesi/Synapsis?style=social)](https://github.com/Synapsis-Bitirme-Projesi/Synapsis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Azure-blue.svg?logo=postgresql)](https://www.postgresql.org/)

> **Synapsis: Your Neural Hub for Academic Mastery**  
> A student-centered planner that brings schedules, tasks, notes, community, and AI study help into one workspace.

## Project Overview
Students juggle portals, calendars, to-do apps, and note tools. **Synapsis** unifies that stack: a customizable dashboard, academic scheduler with conflict-aware weekly views, prioritized tasks, course-linked text and whiteboard notes, messaging, and a course-aware AI study assistant.

Inspired by HCI work on reducing context-switching. Aligns with **UN SDG 4: Quality Education**.

**Personas**
- **Zeynep** (busy university student): dashboard for today's classes and urgent deadlines  
- **Emir** (exam-prep student): visual task progress, notes, and AI review materials  

## Team
| Member | Role |
|--------|------|
| **Ahmet Tolga Kucuk** | Backend, database, auth, AI services, deployment |
| **Yunus Emre Durak** | Frontend architecture, dashboard, calendar, assistant UI, whiteboard |
| **Nazif Tosun** | Tasks, notes UX, exams, dashboard widgets, UI polish |

Yasar University - Software Engineering graduation project.

## Key Features (Final)
| Area | What shipped |
|------|----------------|
| **Auth and Profile** | Register / login (email verification), JWT + NextAuth, profile page |
| **Dashboard** | Widget-style overview: today's classes, upcoming exams, urgent tasks |
| **Academic Scheduler** | Weekly course grid with **side-by-side overlap** rendering; monthly calendar for exams and deadlines |
| **Exams** | CRUD exams; open from calendar to edit/delete |
| **Tasks** | Priority, course tags, types, overdue badges, edit modal, **email reminders** (cron) |
| **Notes** | Tiptap text editor + **whiteboard mode**; autosave; **link/unlink to courses** with confirmation |
| **AI Study Assistant** | Course-scoped chat; summaries, questions, flashcards; streaming; citations; preference + cache |
| **Community** | Feed + direct messages (Socket.IO) |
| **UX** | Dark mode, English UI, loading/empty/error states, mobile sidebar improvements |

## Tech Stack
| Layer | Stack |
|-------|--------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, NextAuth, Tiptap, Socket.IO client, KaTeX/Markdown for AI replies |
| **Backend** | Node.js, Express, PostgreSQL (pg), Socket.IO, node-cron, Nodemailer, Multer |
| **AI** | Google Gemini (@google/genai) and/or Ollama; study artifact + cache tables |
| **Auth** | NextAuth credentials + JWT |
| **Deploy target** | Frontend -> Vercel · Backend -> Render (or similar) · DB -> Azure PostgreSQL |

## Repository Layout
`
Synapsis/
├── backend/          # Express API, schema, AI, cron, sockets
├── frontend/         # Next.js app (App Router)
├── PROGRESS.md       # Final delivery checklist and status
├── TASKS.md          # Sprint board with owners
└── CONTRIBUTING.md   # Branching, commits, ownership
`

## Quick Start

### 1. Clone and install
`ash
git clone https://github.com/Synapsis-Bitirme-Projesi/Synapsis.git
cd Synapsis

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
`

### 2. Environment
`ash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
`
Fill real values (DB, JWT/NextAuth secrets, FRONTEND_URL / NEXT_PUBLIC_API_URL, optional GEMINI_API_KEY and mail settings). **Never commit .env files.**

### 3. Database
PostgreSQL must be reachable with the credentials in ackend/.env.  
Schema and runtime migrations live under ackend/src/database/schema.sql and ackend/src/config/.

### 4. Run locally
`ash
# Terminal 1 - API
cd backend
npm run dev          # http://localhost:5000
npm test             # API tests (server should be up)

# Terminal 2 - Web
cd frontend
npm run dev          # http://localhost:3000
`

Open [http://localhost:3000](http://localhost:3000).

## Development Roadmap (Completed)
| Phase | Focus | Status |
|-------|--------|--------|
| 1 | DB schema, auth, wireframes | Done |
| 2 | Dashboard | Done |
| 3 | Calendar and scheduler (+ overlaps) | Done |
| 4 | Tasks and notes (+ whiteboard, course link) | Done |
| 5 | AI assistant and study outputs | Done |
| 6 | Tests, polish, docs, deploy prep | Done (device SUS pass optional follow-up) |

Details: [PROGRESS.md](PROGRESS.md) · task owners: [TASKS.md](TASKS.md)

## Testing
`ash
cd backend && npm test
# Frontend unit-style checks (Node):
# frontend/app/components/__tests__/
# frontend/app/lib/__tests__/
`

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md). Short version:
1. Branch from main (eat/..., ix/..., chore/...)
2. Conventional commits
3. Open a PR; at least one teammate review
4. Run backend tests before merge when touching API behavior

## Acceptance Criteria
- Core academic flows work end-to-end (auth -> schedule -> tasks -> notes -> AI)
- Responsive layout on desktop; improved mobile navigation
- Real-time-friendly CRUD via REST (+ sockets for messaging)
- Target usability: SUS >= 75 (formal study still recommended)

## License and Ethics
MIT License. Prioritizes privacy-minded storage, authenticated APIs, and a calm, low-friction UI.

## References
- Nielsen - Usability Engineering  
- Cognitive Load Theory (Chandler and Sweller)  
- HCI and personal knowledge management literature  

**Ready to synapse your studies? Star the repo and dive in.**

*Built with care by Ahmet Tolga Kucuk, Yunus Emre Durak and Nazif Tosun - Yasar University Software Engineering*
