# Estate Guide API (NestJS)

Backend API for Estate Guide, targeting GCP Cloud Run + Cloud SQL (Postgres + PostGIS) + Cloud Storage, with MSG91 OTP and httpOnly cookie auth.

## Features (phase 1)
- Health and version endpoints (`/api/v1/healthz`, `/api/v1/version`)
- Project structure ready for modules aligned with `../api/openapi.yaml`
- Helmet, cookie-parser, validation pipe, CORS, Dockerfile

## Local development

Prereqs: Node.js 20, Postgres (optional for now)

1. Install deps
```
npm ci
```

2. Copy env file and adjust
```
cp .env.example .env
```

3. Run dev server
```
npm run start:dev
```

### Local PostgreSQL with Docker (recommended)

Spin up a local Postgres + pgAdmin using the provided `docker-compose.dev.yml`:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Connection details (matches `.env.example` suggestion):

- Host: localhost
- Port: 5432
- User: estate
- Password: estatepass
- Database: estateguide

Then set `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql://estate:estatepass@localhost:5432/estateguide
```

Apply migrations (or create an initial one if not present yet):

```bash
npx prisma migrate dev --name init
```

Open pgAdmin at http://localhost:5050 (admin@local / admin123) to inspect data.

### Tear down

```bash
docker compose -f docker-compose.dev.yml down
```

Server listens on PORT (default 8080) with base path `/api/v1`.

## Docker (local)
```
docker build -t estateguide-api .
docker run --rm -p 8080:8080 --env-file .env estateguide-api
```

## Cloud Run deployment (high level)
- Build and push image to Artifact Registry
- Create Cloud SQL (Postgres) with PostGIS, set DATABASE_URL
- Create 2 GCS buckets: public (images), private (brochures)
- Deploy to Cloud Run with required env vars; set min instances as desired
- Configure Cloud CDN on public bucket for images

Refer to `../api/openapi.yaml` for API contract.