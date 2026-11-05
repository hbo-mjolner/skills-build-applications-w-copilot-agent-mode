# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.
- Presentation tier decision: Use the shared API client and existing React routes/pages to render API data, with explicit accessible loading, empty, and error states.
- Logic tier decision: Implement the `/api/*` contracts in Express routes/services; validate inputs and return deliberate 4xx responses rather than leaking cast errors or unimplemented responses.
- Data tier decision: Define required Mongoose fields, references, and validation for users, teams, activities, and workouts; preserve idempotent seeding.
- Activity tracking approach: List and create activities; validate that submitted user and team IDs are well-formed and refer to existing records, and compute `points` and `occurredAt` on the server.
- Team management approach: List and create teams while preserving `name`, `mascot`, and members; reject a missing name with `400`.
- Leaderboard approach: Sum activity points by team, sort highest total first, and return each team's name, total, and 1-based rank.
- Workout suggestions approach: Find the user by email and recommend workouts based on their goal or recent activity, with an explanatory reason; return a deliberate 4xx when no user matches.

## Test plan

- Data tier — `npm run test:data --prefix octofit-tracker/backend`: 4 failed, 1 passed. Failures indicate missing required validation for user identity/goals, team name/mascot, activity fields, and workout fields; idempotent seeding passes.
- API — `npm run test:api --prefix octofit-tracker/backend`: 4 failed. Failures indicate activity/team invalid input is not deliberately rejected with `400`, leaderboard aggregation/ranking is missing, and workout suggestions do not match the user's activity pattern.
- Frontend — `npm test --prefix octofit-tracker/frontend`: 15 failed. Failures indicate API-backed rendering/request behavior and accessible loading, empty, and error states are not implemented as expected across the pages.
- Backend build — `npm run build --prefix octofit-tracker/backend`: not run yet; use to check backend TypeScript compilation after implementation.
- Frontend build — `npm run build --prefix octofit-tracker/frontend`: not run yet; use to check frontend compilation after implementation.
