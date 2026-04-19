# QuizMaster Monorepo

QuizMaster is a full-stack quiz platform with OTP-verified authentication, cookie-based sessions, quiz attempts, leaderboard tracking, admin quiz management, and an AI-powered analysis assistant.

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

- OTP-based signup verification
- Forgot-password flow with OTP verification
- Access token + refresh token session flow with secure cookies
- Role-based access (`user` and `admin`) with 2-step OTP verification for Admin Access
- Live Multiplayer 1v1 Battles with real-time matchmaking and analytics
- Quiz listing and randomized question generation
- Quiz submission with scoring and retake flow
- Attempt history and dashboard analytics
- Quiz-wise leaderboard
- Detailed attempt report (selected vs correct answer per question)
- Admin operations: create, list, delete, merge quizzes, list users
- Assistant endpoint for quiz stats and AI-generated learning analysis
- Supports LaTeX in question/option text using `$...$` or `$$...$$`
- Supports optional `questionImage` URL per question (options remain text)

## Backend Deep Dive (Primary Logic)

### Architecture

- `src/server.js`: boots app, loads env, connects MongoDB, starts HTTP server
- `src/app.js`: Express app wiring and route registration
- `src/routes/*`: route-to-controller mapping
- `src/controllers/*`: business logic and response handling
- `src/middleware/auth.js`: access-token verification from cookies or bearer header and admin-role guard
- `src/models/*`: MongoDB schemas for Users, Quiz, Attempt
- `src/services/geminiService.js`: Gemini API integration with model fallback/cache

### Main API Groups

- Auth
- `POST /signup/request-otp`
- `POST /signup/verify-otp`
- `POST /signin`
- `POST /forgot-password/request-otp`
- `POST /forgot-password/reset`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /admin/request-otp`
- `POST /admin/verify-otp`

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
- OTP-gated signup and OTP-based password reset
- Short-lived access token + long-lived refresh token flow
- Cookie-based auth with `HttpOnly` session cookies
- Protected routes via access-token middleware
- Admin-only route protection using role checks
- Input validation with `zod` (auth payloads) and controller-side checks
- ObjectId validation before destructive/lookup operations
- Attempt ownership enforcement for report access
- Secrets loaded from `backend/.env`
- Startup guard for required `ADMIN_AUTH_KEY`

## Security Hardening Recommendations

- Set a strong `ACCESS_SECRET` and rotate if ever exposed
- Set a strong `ADMIN_AUTH_KEY` and rotate if ever exposed
- Set `ADMIN_SECRET` explicitly in `.env` (avoid relying on default fallback)
- Set `CLIENT_ORIGIN` to the exact frontend origin in production
- Set `COOKIE_SECURE=true` in production so auth cookies are HTTPS-only
- Add rate limiting for auth and admin endpoints
- Add request logging and centralized error handling
- Replace the current console OTP delivery with a real SMTP mail transport

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
ACCESS_SECRET=your_access_secret
REFRESH_SECRET=your_refresh_secret
ADMIN_AUTH_KEY=your_admin_auth_key
ADMIN_SECRET=your_admin_secret
GEMINI_API_KEY=optional_gemini_api_key
CLIENT_ORIGIN=http://localhost:5173
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
OTP_EXPIRES_MINUTES=10
COOKIE_SECURE=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email_username
SMTP_PASS=your_email_password
MAIL_FROM=no-reply@example.com
```

Auth flow now works like this:
- User signs up by submitting name, email, and password.
- Backend generates an OTP and stores its hash with an expiry.
- User verifies the OTP to activate the account.
- Backend issues a short-lived access token and a longer-lived refresh token in cookies.
- When the access token expires, the frontend calls `/auth/refresh` automatically using the refresh token cookie.
- Forgot password follows the same OTP pattern before the password is changed.
- Admin access upgrades require 2-step verification. The user submits the admin key, which triggers an OTP sent to the `SMTP_USER` email address (the platform owner). The owner provides the code to the user to finalize the upgrade.

Note: OTP delivery uses `nodemailer` to dispatch secure codes to users (and administrators). Ensure your `backend/.env` has proper `SMTP_USER` and `SMTP_PASS` parameters configured.

Run backend:

```bash
npm run dev
```

Health check:

```text
GET http://localhost:3000/health
```

## Deploy On Render

This repo includes a root `render.yaml` blueprint that can deploy:
- `quizmaster-backend` as a Render web service
- `quizmaster-frontend` as a Render static site

### Before You Push

Make sure you do not commit:
- local secret files such as `backend/.env`
- temporary test files
- local workspace metadata such as `.codex`

### Render Blueprint Flow

1. Push the latest code to GitHub.
2. In Render, click `New` -> `Blueprint`.
3. Connect this repository and select the branch you want to deploy.
4. Render will detect `render.yaml` and create both services.

### Backend Environment Variables

Set these on `quizmaster-backend`:
- `MONGO_URL`
- `ACCESS_SECRET`
- `REFRESH_SECRET`
- `ADMIN_AUTH_KEY`
- `ADMIN_SECRET`
- `CLIENT_ORIGIN`
- `EMAIL_USER`
- `EMAIL_APP_PASSWORD`
- `MAIL_FROM`
- `GEMINI_API_KEY` (optional)

Notes:
- `CLIENT_ORIGIN` should be the exact frontend URL in production.
- If you want both local development and Render frontend to work, you can provide a comma-separated list, for example:
  `https://your-frontend.onrender.com,http://localhost:5173`
- `COOKIE_SECURE` is already set to `true` in `render.yaml`, which is correct for HTTPS on Render.

### Frontend Environment Variables

Set these on `quizmaster-frontend`:
- `VITE_API_BASE_URL`

Use the full backend URL, for example:

```env
VITE_API_BASE_URL=https://quizmaster-backend.onrender.com
```

### Verify Deployment

Check:
- Backend health: `https://<your-backend-service>.onrender.com/health`
- Frontend loads successfully and can sign in/sign up against the backend

You can use `backend/.env.example` and `frontend/.env.example` as the source templates for env variable names.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Vite usually starts on `http://localhost:5173`.

Note: frontend API base URL comes from `VITE_API_BASE_URL` in `frontend/src/api.js` (falls back to `http://localhost:3000` for local development). The frontend now sends requests with credentials enabled, so `CLIENT_ORIGIN` on the backend must match the frontend origin.
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
