# Production deployment

Deploy the `frontend` folder to Netlify as a static Vite site at `https://app.yourdomain.com` and the `backend` folder as a Node service at `https://api.yourdomain.com`.

The browser must be able to reach the API for login, learner progress, and audio processing. This does not expose the backend source code, Supabase service-role key, OpenAI/Groq keys, server shell, hosting dashboard, or database dashboard. Keep access to those systems limited to your team with MFA.

## Frontend

Create a Netlify site from this Git repository. Keep the base directory empty because this repository contains both the frontend and backend. Use these build settings:

```text
Build command: npm ci && npm run frontend:build
Publish directory: frontend/dist
```

Configure these build-time environment variables in Netlify for the production deploy context:

```text
VITE_API_URL=https://api.yourdomain.com/api
VITE_API_BASE=https://api.yourdomain.com
```

The `frontend/public/_redirects` file is included so that direct links in the React single-page app load `index.html` instead of returning a 404.

## Backend

Configure these runtime variables in the backend host. Do not put any of them in the frontend host.

```text
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://app.yourdomain.com
JWT_SECRET=<a unique, long random secret>
SUPABASE_URL=<your Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
OPENAI_API_KEY=<if used>
GROQ_API_KEY=<if used>
```

Build command: `npm ci && npm run backend:build`

Start command: `npm -w backend run start`

Run both SQL migrations in `backend/supabase/migrations` using the Supabase SQL Editor. Create the first team account, then promote it with the commented `update` command in `202609190001_add_admin_role.sql`.

## Security ownership

- Clients can use the public app and its authenticated API endpoints.
- Only `admin` accounts can modify character records; public sign-up creates learners only.
- Audio processing now requires an authenticated user.
- Only the configured frontend origin can make browser API calls.
- Limit the hosting, source-control, Supabase, and domain-provider accounts to your team. Enable MFA. Do not deploy `.env` files or grant clients access to those accounts.
