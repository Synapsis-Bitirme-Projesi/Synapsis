# Synapsis 🌐🧠

[![GitHub Repo stars](https://img.shields.io/github/stars/Synapsis-Bitirme-Projesi/Synapsis?style=social)](https://github.com/Synapsis-Bitirme-Projesi/Synapsis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg?logo=node.js)](https://nodejs.org/)

> **Synapsis: Your Neural Hub for Academic Mastery**  
> *A student-centered planner and dashboard that synapses your schedules, tasks, notes, and future AI smarts into one seamless workspace. Say goodbye to app-juggling chaos!*

## 🎯 Project Overview
Modern students battle fragmented tools—university portals, calendars, to-do apps—leading to cognitive overload. **Synapsis** unifies it all: a customizable dashboard, academic scheduler, prioritized tasks, course-linked notes, and architecture primed for an embedded AI assistant (post-MVP). 

Inspired by HCI research on reducing context-switching, Synapsis delivers a "pane of glass" for your academic life. Aligns with UN SDG 4: Quality Education.

**Personas Served:**
- **Zeynep** (Busy Uni Student): Instant dashboard for today's classes & urgent deadlines.
- **Emir** (Exam-Prep HS Student): Visual task progress & recurring to-dos.

## ✨ Key Features (MVP)
| Epic | Features |
|------|----------|
| **User Profile & Dashboard** | Secure auth, widget-based UI (toggle/reorder: Upcoming Exams, Today's Classes, Urgent Tasks) |
| **Academic Scheduler** | Weekly course creator, calendar views (monthly/weekly) for deadlines/exams |
| **Task Management** | Prioritized to-dos, course tagging, CRUD ops |
| **Notes System** | Contextual editor linked to courses, persistent storage |

**Future (Post-MVP):** AI agent for note retrieval, study plans, block-based editing with domain personas (e.g., "School Teacher").

## 🛠 Tech Stack
- **Frontend:** Next.js (React) + Tailwind CSS for responsive, widget-rich UI
- **Backend:** Node.js/Express for RESTful APIs
- **Database:** PostgreSQL (structured for notes/tasks/courses, RAG-ready)
- **Auth:** JWT or NextAuth
- **Deployment:** Vercel/Netlify (frontend), Render/Heroku (backend+DB)
- **Standards:** WCAG 2.1, GDPR/KVKK compliant

**Complexity Factors:** T2 (performance/reactive UI), T3 (end-user efficiency), T4 (processing), T5 (reusability), T7 (usability), T8 (responsive web), T9 (maintenance), T11 (security).

## 🚀 Quick Start
1. **Clone & Install**
   ```bash
   git clone https://github.com/Synapsis-Bitirme-Projesi/Synapsis.git
   cd Synapsis
   # Backend
   cd backend && npm install
   # Frontend
   cd ../frontend && npm install
   ```

2. **Environment Setup**
   Create `.env` files:
   ```
   # backend/.env
   DATABASE_URL=postgresql://user:pass@localhost:5432/synapsis
   JWT_SECRET=your-secret
   ```
   ```
   # frontend/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

3. **Database**
   ```bash
   npm run db:migrate  # backend
   ```

4. **Run Locally**
   ```bash
   # Backend
   npm run dev  # http://localhost:5000
   # Frontend (new terminal)
   npm run dev  # http://localhost:3000
   ```

5. **Test It!** Open `http://localhost:3000` – customize your dashboard!

## 📋 Development Roadmap (Sprints)
- **Phase 1 (S1-2):** DB schema, auth, dashboard wireframes
- **Phase 2 (S3-4):** Epic 1 (Dashboard)
- **Phase 3 (S5-6):** Epic 2 (Calendar/Scheduler)
- **Phase 4 (S7-8):** Epics 3-4 (Tasks/Notes)
- **Phase 5 (S9-10):** Testing, responsive, docs (SUS ≥75)

## 🤝 Contributing
1. Fork & PR
2. Follow Agile sprints
3. Run `npm test` before push
4. Docs: Update this README!

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 Acceptance Criteria
- Pages load fast on broadband
- Responsive (desktop/tablet/mobile)
- Real-time CRUD sync
- SUS score ≥75

## 🔒 License & Ethics
MIT License. Prioritizes data privacy (encrypted storage), security (auth/validation), well-being (simple UI).

## 📚 References
- Nielsen's Usability Engineering
- Cognitive Load Theory (Chandler & Sweller)
- HCI & PKM literature

**Ready to synapse your studies? Star us & dive in!** ⭐

*Built with ❤️ by Yașar University Software Engineering Team*