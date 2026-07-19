# Synapsis — Roadmap

## Current Phase
Post-MVP product expansion focused on calendar conflict handling, AI assistance, and connected note workflows.

## Product Direction
The current foundation is stable. The next iteration should turn Synapsis into a smarter academic workspace with three priorities:
1. Calendar entries must support overlapping events without hiding conflicts.
2. Notes should become course-aware and reusable across the rest of the app.
3. AI features should generate course-specific study help from the user’s own content.

## Delivery Plan

### Phase 1 — Calendar Conflict Rendering
Goal: make overlapping classes visible instead of mutually exclusive.

- [x] Update the schedule data model so multiple events can share the same day and time slot without overwriting each other.
- [x] Preserve click targets for each overlapping event so editing and deleting still work independently.
- [x] Add visual indicators for conflicts, such as grouped counts, side-by-side cards, or overlap badges.
- [x] Validate the behavior with same-course and cross-course overlap cases.

### Phase 2 — AI Study Assistant
Goal: add an AI chatbot that understands the user’s courses and notes.

- [x] Introduce a chatbot UI surface that can run inside a course view or a dedicated assistant panel.
- [x] Define a course-scoped context payload that includes syllabus metadata, linked notes, and recent study material.
- [x] Add prompt templates for three core modes: question examples, concise summaries, and quick-review cards.
- [x] Expose a course selector so the assistant can generate output for a specific class.
- [x] Support note-aware generation, where the chatbot can transform saved notes into study artifacts.
- [x] Store generated outputs as reusable artifacts so the user can revisit them later.
- [x] Add streaming responses and loading states to keep the assistant usable for longer generations.

### Phase 3 — Notes to Course Linking
Goal: let a note be attached to a course with explicit user confirmation.

- [x] Add a note-to-course relation in the data model, either as a foreign key or a join table depending on whether notes can belong to multiple courses.
- [x] Add a confirmation pop-up before linking a note to a course.
- [x] Show the linked course in the notes list and editor header.
- [x] Add an unlink action with a separate confirmation flow.
- [x] Make linked notes available to the AI assistant so course-based generation can use real note content.
- [x] Keep the linking flow reversible so the note remains usable even if the user changes courses later.

### Phase 4 — Whiteboard Notes Experience
Goal: evolve the note editor into a visual whiteboard for faster study workflows.

- [x] Evaluate a whiteboard canvas model that supports freeform text blocks, drag/drop nodes, and lightweight drawing.
- [x] Preserve text editing from the current notes flow while adding spatial organization.
- [x] Support study structures such as concept maps, bullet clusters, and quick sketch annotations.
- [x] Ensure the whiteboard content can still be autosaved and synchronized to the backend.
- [x] Add export or conversion paths so a whiteboard note can still feed the AI summary and flashcard generators.
- [x] Keep the interaction model simple enough for mobile and tablet use where possible.

### Phase 5 — AI Study Outputs
Goal: turn notes into course-specific learning assets.

- [x] Generate example questions from a selected course’s notes.
- [x] Generate short summaries optimized for rapid review.
- [x] Generate flashcards or quick-read cards from the same content source.
- [x] Let users choose output format, depth, and tone per course.
- [x] Add citations or source references back to the original note blocks when possible.
- [x] Cache generated study sets to avoid rerunning the same prompt unnecessarily.

### Phase 6 — Polish and Validation
Goal: make the new features reliable before release.

- [x] Add regression tests for calendar overlap rendering.
- [x] Add API tests for note-course linking and AI generation endpoints. (`backend/tests/notes-course-linking.test.mjs`, `backend/tests/ai-generation.test.mjs` — run with `npm test` in `backend/`, requires the dev server running)
- [x] Verify empty states, loading states, and error states across all new surfaces. (calendar + weekly schedule now show loading/error states instead of a silent blank grid; notes list distinguishes loading vs. genuinely empty and surfaces fetch errors with a retry action; AI Assistant panel's `alert()` popups replaced with an inline toast)
- [x] Review performance for large note sets and dense calendars. (added missing `user_id` indexes on `notes`, `courses`, `exams`, `tasks` — every list query filters on this column and had none; see `backend/src/config/db.js` and `schema.sql`)
- [ ] Confirm the new flows work on desktop and mobile breakpoints. (code-reviewed only, not visually verified on real devices/browser — fixed the fixed-width notes sidebar with a mobile drawer; still open: the weekly schedule stays horizontally-scrollable rather than a compact mobile view, and the whiteboard canvas has no touch/pinch gestures)

## Current Stack
- Frontend: Next.js 14 / Tailwind CSS / NextAuth / Tiptap
- Backend: Node.js / Express / PostgreSQL (pg)
- Auth: NextAuth credentials + JWT
- AI layer: integrated NotebookLM-style assistant (sources, course-aware context, Ollama/Gemini streaming, artifact storage)

## Near-Term Risks
- Whiteboard sketch strokes are stored as point paths; richer drawing tools (and touch/pinch gestures) can be layered later.
- Study-set cache keys depend on selected sources + preferences; force-regenerate is available when notes change outside fingerprint coverage.
- Mobile breakpoints were reviewed in code only (no real device/browser pass) — see the open Phase 6 checklist item above.
- Usability testing (target SUS ≥75, see TASKS.md) requires real users running through the app and cannot be completed by an automated pass — still open.

## Deployment
Not yet deployed. To ship the current stack (matches README's intended split):

- **Frontend → Vercel**: point the project root at `frontend/`. Set `NEXT_PUBLIC_API_URL` to the deployed backend's URL, plus `NEXTAUTH_SECRET` and `NEXTAUTH_URL` (see `frontend/.env.example`).
- **Backend → Render (or similar Node host)**: point the service root at `backend/`, build command `npm install`, start command `npm start`. Set `FRONTEND_URL` to the deployed frontend's URL (used for CORS), plus `DB_*`, `JWT_SECRET`, `NEXTAUTH_SECRET`, `GEMINI_API_KEY` (see `backend/.env.example`).
- **Database**: already hosted on Azure PostgreSQL; only the connection env vars need to move with the backend deploy.
- All API base URLs were previously hardcoded to `http://localhost:5000` across ~11 frontend files, which would have silently broken in any real deployment — this is now centralized in `frontend/app/lib/api.ts` and backend CORS now reads `FRONTEND_URL` instead of a hardcoded origin, so the app is deployable once the two services are provisioned.
- Actually creating the Vercel/Render (or equivalent) projects and setting secrets requires account access this session doesn't have — that step is still manual.

## Branch
main

## Local Run
```bash
# Backend (terminal 1)
cd backend
npm install
cp .env.example .env   # then fill in real values (never commit this file)
npm run dev   # http://localhost:5000
npm test      # runs backend/tests/*.test.mjs against the running dev server

# Frontend (terminal 2)
cd frontend
npm install
cp .env.example .env.local   # then fill in real values (never commit this file)
npm run dev   # http://localhost:3000
```
