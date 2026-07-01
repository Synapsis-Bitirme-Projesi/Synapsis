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
- [ ] Validate the behavior with same-course and cross-course overlap cases.

### Phase 2 — AI Study Assistant
Goal: add an AI chatbot that understands the user’s courses and notes.

- [ ] Introduce a chatbot UI surface that can run inside a course view or a dedicated assistant panel.
- [ ] Define a course-scoped context payload that includes syllabus metadata, linked notes, and recent study material.
- [ ] Add prompt templates for three core modes: question examples, concise summaries, and quick-review cards.
- [ ] Expose a course selector so the assistant can generate output for a specific class.
- [ ] Support note-aware generation, where the chatbot can transform saved notes into study artifacts.
- [ ] Store generated outputs as reusable artifacts so the user can revisit them later.
- [ ] Add streaming responses and loading states to keep the assistant usable for longer generations.

### Phase 3 — Notes to Course Linking
Goal: let a note be attached to a course with explicit user confirmation.

- [ ] Add a note-to-course relation in the data model, either as a foreign key or a join table depending on whether notes can belong to multiple courses.
- [ ] Add a confirmation pop-up before linking a note to a course.
- [ ] Show the linked course in the notes list and editor header.
- [ ] Add an unlink action with a separate confirmation flow.
- [ ] Make linked notes available to the AI assistant so course-based generation can use real note content.
- [ ] Keep the linking flow reversible so the note remains usable even if the user changes courses later.

### Phase 4 — Whiteboard Notes Experience
Goal: evolve the note editor into a visual whiteboard for faster study workflows.

- [ ] Evaluate a whiteboard canvas model that supports freeform text blocks, drag/drop nodes, and lightweight drawing.
- [ ] Preserve text editing from the current notes flow while adding spatial organization.
- [ ] Support study structures such as concept maps, bullet clusters, and quick sketch annotations.
- [ ] Ensure the whiteboard content can still be autosaved and synchronized to the backend.
- [ ] Add export or conversion paths so a whiteboard note can still feed the AI summary and flashcard generators.
- [ ] Keep the interaction model simple enough for mobile and tablet use where possible.

### Phase 5 — AI Study Outputs
Goal: turn notes into course-specific learning assets.

- [ ] Generate example questions from a selected course’s notes.
- [ ] Generate short summaries optimized for rapid review.
- [ ] Generate flashcards or quick-read cards from the same content source.
- [ ] Let users choose output format, depth, and tone per course.
- [ ] Add citations or source references back to the original note blocks when possible.
- [ ] Cache generated study sets to avoid rerunning the same prompt unnecessarily.

### Phase 6 — Polish and Validation
Goal: make the new features reliable before release.

- [ ] Add regression tests for calendar overlap rendering.
- [ ] Add API tests for note-course linking and AI generation endpoints.
- [ ] Verify empty states, loading states, and error states across all new surfaces.
- [ ] Review performance for large note sets and dense calendars.
- [ ] Confirm the new flows work on desktop and mobile breakpoints.

## Current Stack
- Frontend: Next.js 14 / Tailwind CSS / NextAuth / Tiptap
- Backend: Node.js / Express / PostgreSQL (pg)
- Auth: NextAuth credentials + JWT
- AI layer: planned integration for course-aware prompt generation and artifact storage

## Near-Term Risks
- Calendar overlap rendering may require a deeper scheduler layout rewrite than a simple UI patch.
- AI features will need a clear data boundary so prompts only use authorized course and note content.
- Whiteboard notes may require a new storage format if the current rich-text structure is too limited.

## Branch
main

## Local Run
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
