# Darcy deployment checklist

## Railway backend

Keep the Railway service root directory set to `/darcy-backend` (or set the custom config path to `/darcy-backend/railway.json`). The checked-in Railway config builds the TypeScript API, runs the idempotent migration and demo seeder before every deployment, starts `dist/index.js`, and checks `/health`.

Required Railway variables:

- `DATABASE_URL` — the existing Neon PostgreSQL connection string.
- `JWT_SECRET` and `JWT_REFRESH_SECRET` — different long random values.
- `FRONTEND_URL` — the production Vercel origin, without a trailing slash.
- `BACKEND_PUBLIC_URL` — the public Railway service origin, without `/api/v1`.
- `OPENROUTER_API_KEY` — a free OpenRouter key; optional because local fallback remains available.
- `OPENROUTER_MODEL=openrouter/free`.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `CLIENT_EMAIL`, `CLIENT_USERNAME`, and `CLIENT_PASSWORD` — optional; defaults are documented in `.env.example`. For backward compatibility, a legacy `CLIENT_EMAIL` value without `@` is treated as the client username.

For persistent document uploads, keep the four `AWS_*` variables configured. Without them, local uploads work for development but Railway can lose them during a redeploy because its service filesystem is ephemeral.

Stripe, Firebase, and SMTP variables are only required for their corresponding live integrations.

## Vercel frontend

Keep the Vercel project root directory set to `/darcy-frontend-2` and set:

```env
VITE_API_URL=https://your-backend.up.railway.app/api/v1
```

Redeploy Vercel after changing a `VITE_*` variable because Vite injects it at build time.

## Verification after GitHub push

1. Railway pre-deploy logs should show both `All migrations completed successfully` and `Seed complete`.
2. Open `https://your-backend.up.railway.app/health` and confirm a JSON response with `status: ok`.
3. Log in with the seeded admin, super-admin, and client credentials.
4. In the admin applicant pipeline, confirm seeded CV scores are ordered 91, 78, 66, 48, then the unscreened applicant.
5. Upload a text-based PDF/DOCX/TXT CV and run screening. `aiModel` will show the routed model when OpenRouter succeeds or `local-cv-fallback-v1` when the free service is unavailable.
