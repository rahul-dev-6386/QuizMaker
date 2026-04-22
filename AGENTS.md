# QuizMaster AGENTS.md

## Developer Commands

```bash
# Backend (requires MongoDB and .env)
cd backend && npm install    # create backend/.env first
npm run dev                 # starts on port 3000

# Frontend
cd frontend && npm install
npm run dev                 # starts on port 5173
npm run lint                # ESLint
npm run build              # production bundle
```

## Architecture

- **Backend entry**: `backend/server.js` → Express app in `src/app.js`
- **Auth flow**: OTP signup → verified account → JWT access + refresh token in HttpOnly cookies
- **Admin access**: 2-step - first submit `ADMIN_AUTH_KEY`, then OTP sent to platform owner email
- **Scoring**: Server-side in `src/controllers/` - never trust client scores
- **Real-time**: Socket.io for live 1v1 battles

## Key Constraints

- `CLIENT_ORIGIN` in backend `.env` must match frontend origin exactly for auth cookies to work
- MongoDB connection required (Atlas or local)
- No test suite - verify manually via `/health` endpoint or curl

## Non-Obvious Quirks

- Questions support LaTeX via `$...$` (inline) or `$$...$$` (block)
- Optional `questionImage` field per question (options remain text)
- `ACCESS_SECRET` and `REFRESH_SECRET` must be different
- Frontend API base URL from `VITE_API_BASE_URL` env (falls back to localhost:3000)