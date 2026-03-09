# QuizMaster Monorepo

QuizMaster is a full-stack quiz platform with authentication, quiz attempts, leaderboard tracking, admin quiz management, and an AI-powered analysis assistant.

This repository contains:
- `backend`: Node.js + Express + MongoDB REST API
- `frontend`: React + Vite client application

## Project Structure

```text
project/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/
  frontend/
    src/
      pages/
      components/
```

## Core Product Features

- User signup/signin with JWT-based sessions
- Role-based access (`user` and `admin`)
- Quiz listing and randomized question generation
- Quiz submission with scoring and retake flow
- Attempt history and dashboard analytics
- Quiz-wise leaderboard
- Detailed attempt report (selected vs correct answer per question)
- Admin operations: create, list, delete, merge quizzes, list users
- Assistant endpoint for quiz stats and AI-generated learning analysis

## Backend Deep Dive (Primary Logic)

### Architecture

- `src/server.js`: boots app, loads env, connects MongoDB, starts HTTP server
- `src/app.js`: Express app wiring and route registration
- `src/routes/*`: route-to-controller mapping
- `src/controllers/*`: business logic and response handling
- `src/middleware/auth.js`: JWT verification and admin-role guard
- `src/models/*`: MongoDB schemas for Users, Quiz, Attempt
- `src/services/geminiService.js`: Gemini API integration with model fallback/cache

### Main API Groups

- Auth
- `POST /signup`
- `POST /signin`
- `POST /admin/authenticate`

- Quiz
- `GET /quizzes`
- `GET /quiz/random/:count`
- `POST /quiz/submit`
- `GET /quiz/leaderboard/:quizId`
- `GET /quiz/report/:attemptId`
- `GET /quiz/analysis/:attemptId`

- Dashboard
- `GET /dashboard/stats`
- `GET /dashboard/attempts`

- Admin
- `POST /admin/quiz/create`
- `GET /admin/quizzes`
- `DELETE /admin/quiz/:quizId`
- `POST /admin/quiz/merge`
- `GET /admin/users`

- Assistant
- `POST /chatbot/chat`

- Health
- `GET /health`

## Security Features (Implemented)

- Password hashing with `bcrypt`
- JWT token auth with expiry (`1h`)
- Protected routes via `Bearer` token middleware
- Admin-only route protection using role checks
- Input validation with `zod` (auth payloads) and controller-side checks
- ObjectId validation before destructive/lookup operations
- Attempt ownership enforcement for report access
- Secrets loaded from `backend/.env`
- Startup guard for required `ADMIN_AUTH_KEY`

## Security Hardening Recommendations

- Set a strong `JWT_SECRET` and rotate if ever exposed
- Set a strong `ADMIN_AUTH_KEY` and rotate if ever exposed
- Set `ADMIN_SECRET` explicitly in `.env` (avoid relying on default fallback)
- Restrict CORS origin from `*` to trusted frontend domains in production
- Add rate limiting for auth and admin endpoints
- Add request logging and centralized error handling
- Add refresh token or shorter token lifetime strategy for production

## Prerequisites

- Node.js 18+ (recommended)
- npm
- MongoDB connection string (Atlas or local MongoDB)

## Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=3000
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_AUTH_KEY=your_admin_auth_key
ADMIN_SECRET=your_admin_secret
GEMINI_API_KEY=optional_gemini_api_key
```

Run backend:

```bash
npm run dev
```

Health check:

```text
GET http://localhost:3000/health
```

## Deploy Backend (Render, Free Tier)

This repo includes a root `render.yaml` blueprint for backend deployment.

1. Push latest code to GitHub.
2. In Render, click `New` -> `Blueprint`.
3. Connect this repository and select the default branch.
4. Render will detect `render.yaml` and create `quizmaster-backend`.
5. In Render service settings, set environment variables:
   - `MONGO_URL`
   - `JWT_SECRET`
   - `ADMIN_AUTH_KEY`
   - `ADMIN_SECRET`
   - `GEMINI_API_KEY` (optional)
6. Trigger deploy and verify:
   - `https://<your-render-service>.onrender.com/health`

You can use `backend/.env.example` as the source template for env variable names.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Vite usually starts on `http://localhost:5173`.

Note: frontend API base URL comes from `VITE_API_BASE_URL` in `frontend/src/api.js` (falls back to `http://localhost:3000` for local development).
Set frontend env vars in deployment:

```env
VITE_API_BASE_URL=your_backend_base_url
```

## Run Full Stack Locally

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

## Scripts

### Backend

- `npm run dev`: start backend server
- `npm run start`: start backend server
- `npm run check`: syntax check backend entry files

### Frontend

- `npm run dev`: start Vite dev server
- `npm run build`: build production bundle
- `npm run preview`: preview production build
- `npm run lint`: run ESLint

## Git Safety

- `backend/.env` is ignored via `backend/.gitignore`
- Never commit real secrets
- If any secret was exposed earlier, rotate it before pushing
