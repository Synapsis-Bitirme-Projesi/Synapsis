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
- [ ] Let users choose output format, depth, and tone per course.
- [ ] Add citations or source references back to the original note blocks when possible.
- [ ] Cache generated study sets to avoid rerunning the same prompt unnecessarily.

### Phase 6 — Polish and Validation
Goal: make the new features reliable before release.

- [x] Add regression tests for calendar overlap rendering.
- [ ] Add API tests for note-course linking and AI generation endpoints.
- [ ] Verify empty states, loading states, and error states across all new surfaces.
- [ ] Review performance for large note sets and dense calendars.
- [ ] Confirm the new flows work on desktop and mobile breakpoints.

## Current Stack
- Frontend: Next.js 14 / Tailwind CSS / NextAuth / Tiptap
- Backend: Node.js / Express / PostgreSQL (pg)
- Auth: NextAuth credentials + JWT
- AI layer: integrated NotebookLM-style assistant (sources, course-aware context, Ollama/Gemini streaming, artifact storage)

## Near-Term Risks
- AI features still need stronger citation/caching behavior for production reliability.
- Responsive polish and broader automated API coverage remain open.
- Whiteboard sketch strokes are stored as point paths; richer drawing tools can be layered later.

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
