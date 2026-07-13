# Darcy AI CV Screening

This project includes server-side OpenRouter-free integration for assistive CV screening and an admin pipeline assistant.

## What it does

- Admins upload a CV from the Applicant Pipeline.
- CV text is extracted in memory on the backend and sent to OpenRouter's free chat router when configured.
- OpenRouter returns a structured assessment using a fixed 100-point rubric.
- The assessment, score, model, filename, and analysis time are stored on the applicant.
- Applicant lists sort screened candidates by AI score, highest first. Unscreened candidates appear afterward.
- The admin AI assistant answers questions using an authorized snapshot of pipeline data.

The uploaded CV bytes and extracted text are not written to disk by the AI screening endpoint. Only the resulting assessment and original filename are stored by Darcy. If OpenRouter is unavailable or its free limit is reached, the same fixed rubric is evaluated by a deterministic local fallback so the endpoint remains usable.

## Configuration

Add these values to `darcy-backend/.env`:

```env
OPENROUTER_API_KEY=your_free_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
```

`OPENROUTER_MODEL` is optional and defaults to the zero-cost `openrouter/free` router. Keep the key only on the backend; never add it to the Vite frontend environment. A free OpenRouter account/key is still required for remote AI inference.

## Database migration

From `darcy-backend` run:

```powershell
npm run migrate
```

The migration adds nullable AI screening columns to `applicants` and creates an index for score ranking. It is safe to run against an existing schema because already-created tables and columns are skipped.

## Demo data

After the migration, populate or refresh the idempotent demo accounts and data:

```powershell
npm run seed
```

The seeder creates/updates admin, super-admin, and client users; one active client and subscription; five ranked applicants; interview slots; a conversation; notifications; time tracking; and a pending onboarding record. Seed credentials come from `ADMIN_*`, `SUPER_ADMIN_*`, and `CLIENT_*` variables, with the defaults shown in `.env.example`.

## API endpoints

- `POST /api/v1/ai/applicants/:id/screen` — admin only; multipart field `cv`, optional `criteria`.
- `POST /api/v1/ai/assistant` — admin only; accepts `question` and optional `clientId`.

Accepted CV extensions: text-based PDF, DOCX, and TXT, up to 10 MB. Image-only/scanned CVs need OCR before upload.

## Scoring rubric

- Relevant experience: 30 points
- Licenses and role skills: 25 points
- Safety and compliance evidence: 20 points
- Relevant work-history evidence: 15 points
- Clarity/completeness of job-relevant CV information: 10 points

The backend calculates the final score by summing these structured subscores. The prompt explicitly excludes protected and sensitive traits and prohibits invented qualifications.

## Human review requirement

The result is decision support, not an automatic hiring or rejection decision. Staff must review the source CV, verify licenses and claims, and apply the same job-related criteria consistently to every candidate. A low score means that evidence was limited in the submitted CV; it is not proof that the candidate is unqualified.
