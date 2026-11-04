# SkillSprint — Personalized Learning Tracker

A full-stack learning tracker that turns a target ("Python Developer, 2h/day,
3 months, Beginner") into a week-by-week roadmap, then keeps that roadmap
honest: it adapts as you fall behind or pull ahead, and automatically
schedules review sessions for topics you score weak on in quizzes.

Built with **Django + Django REST Framework** on the backend and
**React (Vite)** on the frontend, styled with plain hand-written CSS
(no Tailwind, no UI kit).

## The interesting part: the roadmap algorithm

Given a track, a pace (hours/day) and a duration, `learning/roadmap.py`:

1. **Filters topics by level** — beginners get every topic; intermediate
   learners skip `easy` topics in the first two (foundational) skills;
   advanced learners skip `easy` and `medium` topics there too.
2. **Packs topics into weeks** by accumulating `estimated_hours` against a
   weekly capacity of `hours_per_day × 7`, so a 2h/day plan gets fewer
   topics per week than a 4h/day plan.
3. **Load-balances each week across its 7 days**, assigning each topic to
   whichever day currently has the least scheduled load, so daily tasks
   come out reasonably even instead of front-loaded.
4. **Adapts dynamically** via a `/replan/` endpoint: it compares actual
   completion rate to the expected pace (based on elapsed time) and either
   compresses the remaining schedule (you're ahead) or spreads it out
   (you're behind).
5. **Detects weak topics** — any quiz attempt scoring below 70% flags that
   topic, and a "review" roadmap item is automatically inserted so it
   resurfaces.
6. **Tracks streaks** — completing a roadmap item or taking a quiz updates
   a day-based streak counter (increments on consecutive days, resets on a
   gap, tracks the longest streak seen).

## Features

- Curriculum model: Tracks → Skills → Topics, seeded with two real tracks
  (Python Developer, Frontend Developer) and their topics/difficulty/hours
- Onboarding flow to pick a track, pace, duration and current level
- Auto-generated week-by-week roadmap with daily tasks (start/complete/skip)
- Adaptive re-planning (pace detection + review insertion) on demand
- Multiple-choice quizzes per topic with automatic scoring
- Weak-topic detection (<70%) with automatic review scheduling
- Streak tracking (current + longest)
- Dashboard with today's tasks, upcoming tasks, weak topics, recent quizzes
- Progress page with skill-completion and quiz-score charts (Recharts)

## Tech stack

- **Backend:** Django 5, Django REST Framework, django-cors-headers,
  django-filter, SQLite (dev)
- **Frontend:** React 19, Vite, react-router-dom, axios, Recharts, plain CSS
  (CSS custom properties for theming, incl. dark mode)

## Project structure

```
SkillSprint/
├── backend/
│   ├── config/            # settings, root urls
│   ├── accounts/          # register / login / refresh / me
│   ├── learning/          # Track, Skill, Topic, LearningPlan, RoadmapItem,
│   │                        QuizQuestion, QuizAttempt + roadmap.py (algorithm)
│   │   └── management/commands/seed_curriculum.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/            # axios client + Sessions, auth.js, learning.js
    │   ├── context/        # AuthContext, PlanContext
    │   ├── components/     # Navbar, Sidebar, ProgressBar, StatCard, ...
    │   ├── pages/           # Login, Register, Onboarding, Dashboard,
    │   │                      Roadmap, TopicQuiz, Progress
    │   └── index.css        # design system (design tokens + dark mode)
    └── .env.example
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # venv\Scripts\activate on Windows
pip install -r requirements.txt

cp .env.example .env            # edit if needed
python manage.py migrate
python manage.py seed_curriculum   # loads sample tracks/skills/topics/quizzes
python manage.py createsuperuser   # optional, for /admin/
python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000/`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env             # VITE_API_URL, defaults to http://127.0.0.1:8000/api
npm run dev
```

Frontend runs at `http://localhost:5173/`.

Register a new account, then pick a track on the onboarding screen to
generate your roadmap.

## API overview

All endpoints are under `/api/`. Authenticated endpoints expect
`Authorization: Bearer <access_token>`.

| Endpoint | Method(s) | Purpose |
|---|---|---|
| `/auth/register/` | POST | Create an account, returns tokens |
| `/auth/login/` | POST | Obtain JWT access/refresh tokens |
| `/auth/refresh/` | POST | Refresh an access token |
| `/auth/me/` | GET | Current user profile |
| `/tracks/` | GET | List available tracks |
| `/tracks/{id}/` | GET | Track detail with nested skills/topics |
| `/plans/` | GET, POST | List / create the user's learning plans (POST generates the roadmap) |
| `/plans/{id}/` | GET | Plan detail with progress |
| `/plans/{id}/roadmap/` | GET | Roadmap grouped by week |
| `/plans/{id}/replan/` | POST | Adaptively adjust the remaining roadmap |
| `/plans/{id}/dashboard/` | GET | Aggregated dashboard data |
| `/roadmap-items/` | GET | List roadmap items (filter by `plan`, `status`, `week_number`, `is_review`, `scheduled_date`) |
| `/roadmap-items/{id}/start/` | POST | Mark a task in progress |
| `/roadmap-items/{id}/complete/` | POST | Mark a task complete (updates streak) |
| `/roadmap-items/{id}/skip/` | POST | Mark a task skipped |
| `/topics/{id}/quiz/` | GET | Quiz questions for a topic (answers hidden) |
| `/quiz-attempts/` | GET, POST | List / submit quiz attempts (auto-scored, flags weak topics) |

## Adding a new technology / skill / topic (no code required)

The curriculum — Tracks (technologies) → Skills → Topics → quiz questions —
is stored in the database, not hardcoded. `seed_curriculum` just loads two
starter tracks (Python Developer, Frontend Developer) so there's something
to try; you're not limited to those. Everything else can be added through
Django's built-in admin site at any time, while the app is running, with
**no restart and no code change** — it shows up on the Onboarding page the
moment you save it.

1. **Create an admin login** (one-time): `python manage.py createsuperuser`
   in the `backend` folder, then log in at `http://127.0.0.1:8000/admin/`.
2. **Add a new technology**: *Learning → Tracks → Add track*. Give it a
   name (e.g. "DevOps Engineer"), an emoji icon, and a description. The
   page already includes a blank Skill row at the bottom — fill in its
   first skill (e.g. "Containers") right there and save.
3. **Add topics to that skill**: open the skill you just created (*Learning
   → Skills*) — it has a blank Topic row ready to fill in (name,
   difficulty, estimated hours). Save.
4. **Add quiz questions to a topic** (optional but recommended): open the
   topic (*Learning → Topics*) — it has two blank quiz-question rows ready
   to fill in (question, four options, which one is correct). Save.
5. Refresh the Onboarding page in the app — the new track is there, with
   its own icon, skill/topic counts, and a roadmap the same algorithm
   generates for every other track.

Repeat step 2 onward any time you want to add another technology, another
skill within an existing one, or more topics/quiz questions — all of it is
just data, so there's no limit beyond what you enter.

## Notes

- SQLite is used for local development; `db.sqlite3` is not included —
  run `migrate` + `seed_curriculum` after cloning.
- No Tailwind or component library — every style lives in
  `frontend/src/index.css`, using the same design-token approach across
  light and dark themes.
