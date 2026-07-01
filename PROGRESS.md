# Synapsis — Progress Tracker

## Current Phase
Post-MVP Expansion — core modules are stable, and the product is moving into smart learning and workflow enhancement features.

## Build Status
✅ Frontend build passes (`npm run build` from `/frontend`)  
⚠️ Backend: run `npm run dev` from `/backend` — requires PostgreSQL connection and `.env` file  
⚠️ DB migration required before first run: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Task';`

---

## What Is Working

### Foundation
- [x] DB schema: users, courses, tasks, notes tables
- [x] Backend project structure (Express, pg, JWT)
- [x] Frontend Next.js 14 setup (App Router, Tailwind CSS, TypeScript)
- [x] User registration and login with NextAuth credentials provider
- [x] JWT stored in session and synced to localStorage for API calls
- [x] Auth guard: sidebar and protected routes hidden from unauthenticated users
- [x] Public landing page at `/` with Sign In / Sign Up links
- [x] Auth flash and theme flash prevention (inline script + suppressHydrationWarning)

### Dashboard
- [x] Greeting with logged-in user name and today's date
- [x] "Classes today" count — dynamic, based on actual course schedule; hidden on weekends
- [x] Upcoming Deadlines card — shows all types (Exam, Assignment, Quiz, Project, Task) with due dates, sorted by date
- [x] Urgent Tasks card — shows incomplete tasks sorted by priority (High first)
- [x] Weekly Schedule widget — displays course timetable, supports add/edit/delete from grid
- [x] Academic Calendar on dashboard — shows exams and tasks with due dates
- [x] Dark mode toggle — persisted to DB and localStorage

### Courses
- [x] Course list with color-coded cards
- [x] Add, edit, delete courses via modal
- [x] Fields: name, code, day, start/end time, location, color

### Tasks
- [x] Unified "Add New Item" form with Type select (Task, Exam, Assignment, Quiz, Project, Other)
- [x] Type = Exam: submits to `/api/exams`, appears on calendar as colored exam badge
- [x] Type = other: submits to `/api/auth/tasks`, appears on calendar by due date
- [x] Course dropdown populated from real user courses (not hardcoded)
- [x] Priority (High/Medium/Low), due date, description fields
- [x] Task list with type badge, course name, priority badge, due date
- [x] Overdue badge for incomplete tasks past their due date
- [x] Mark task complete / undo (toggle)
- [x] Edit task via pencil icon — modal pre-filled with current values, calls PATCH
- [x] Delete task with confirmation

### Calendar
- [x] Monthly calendar view showing all academic items with dates
- [x] Exams displayed with custom color badge; click to open edit/delete modal
- [x] Tasks with due dates displayed with type-based color coding
- [x] Navigate between months

### Notes
- [x] Note list sidebar (create, select, delete)
- [x] Tiptap rich text editor with auto-save (800ms debounce)
- [x] Slash commands: Heading 1, Heading 2, Bullet list, Numbered list
- [x] Notes persisted to backend `/api/notes`

### Auth & UX
- [x] Logout confirmation modal (no duplicate prompts)
- [x] Dark mode consistent across all pages
- [x] All UI text in English
- [x] Profile page: edit name and email

---

## Planned Features (Based on New Requirements)

### Calendar Enhancements
- [ ] If two classes are scheduled at the same time slot, both classes should be displayed in the calendar/timetable view
- [ ] Improve overlapping-event visualization so conflicts are clear and still readable

### AI Chatbot for Course Assistance
- [ ] Add AI chatbot support for each selected course
- [ ] Chatbot should generate example questions for a specific course
- [ ] Chatbot should generate short summaries for a specific course
- [ ] Chatbot should support quick-study outputs such as fast review cards/flashcards

### Notes → Course Linking
- [ ] Add "Save note to course" functionality in the notes module
- [ ] When linking a note to a course, show a confirmation popup before saving
- [ ] Allow AI features to use course-linked notes as source material

### Whiteboard-Style Notes Experience
- [ ] Explore/implement whiteboard mode for note-taking (freeform note structure and visual layout)
- [ ] Ensure whiteboard notes can still be persisted and linked to courses

### AI from Notes (Course-Aware Generation)
- [ ] From notes taken in Course A, AI should be able to generate:
  - [ ] Example questions
  - [ ] Short summaries
  - [ ] Fast reading cards / study cards

---

## Known Issues / Not Yet Implemented

- [ ] Weekly Schedule "Add course" button in dashboard grid has no modal (add courses via the Courses page instead)
- [ ] Mobile responsiveness not fully polished
- [ ] Usability testing not yet conducted
- [ ] Deployment not yet configured

---

## Stack
- Frontend: Next.js 14 / Tailwind CSS / NextAuth / Tiptap
- Backend: Node.js / Express / PostgreSQL (pg)
- Auth: NextAuth credentials + JWT
- Deployment target: Vercel (frontend), Render/Railway (backend + DB)

## Branch
feature/complete-mvp

## How to Run Locally
```bash
# Backend (terminal 1)
cd backend
npm install
# Create backend/.env with: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, JWT_SECRET
npm run dev   # http://localhost:5000

# Frontend (terminal 2)
cd frontend
npm install
# Create frontend/.env.local with: NEXTAUTH_SECRET=any-random-string, NEXTAUTH_URL=http://localhost:3000
npm run dev   # http://localhost:3000
```
