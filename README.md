# Estate Guide Platform

Full-stack application for showcasing real-estate projects. The front-end is a Vite + React SPA, while the backend is a NestJS service backed by PostgreSQL (Cloud SQL) and Prisma ORM.

## Repository layout

```
src/                 # Public marketing & listings UI (Vite + React)
server/              # NestJS API, Prisma models, migrations
scripts/             # Shared CI helpers (deploy, migrate)
infrastructure/      # Terraform scaffold for Google Cloud resources
.github/             # GitHub Actions workflows & composite actions
```

## Local development

Prerequisites:

- Node.js 20+
- npm 10+
- PostgreSQL (local) if you want to run the API end-to-end

### Front-end

```bash
npm install
npm run dev
```

### Backend

```bash
cd server
npm install
cp .env.example .env   # configure DATABASE_URL and other secrets
npx prisma migrate deploy
npm run start:dev
```

## CI/CD overview

The repository ships with four GitHub Actions workflows:

| Workflow | File | Trigger | Summary |
| --- | --- | --- | --- |
| CI Checks | `.github/workflows/ci-common.yml` | Every PR | Lints + builds both UI and backend |
| UI Build & Deploy | `.github/workflows/ui-build-deploy.yml` | PR, push to `develop`, push/tag to `main` | Builds UI, deploys to Firebase Hosting (preview / staging / prod) |
| Service Build & Deploy | `.github/workflows/service-build-deploy.yml` | PR, push to `develop`, push/tag to `main` | Runs backend tests (with Cloud SQL Proxy), builds Docker image, deploys to Cloud Run |
| Infrastructure & Database | `.github/workflows/db-migrate.yml` | Manual dispatch | Runs Terraform plan/apply against GCS-backed state and (optionally) executes Prisma migrations |

### Firebase preview channels

Pull requests automatically deploy to an ephemeral Firebase Hosting channel named `pr-<PR number>-<run id>`. The URL is exposed in the job summary.

### Cloud Run deployments

- Staging deploys on pushes to `develop` (after tests pass).
- Production deploys on pushes to `main` or annotated tags (`v*.*.*`), respecting GitHub Environment approvals.
- Container images are published to Artifact Registry (`${REGION}-docker.pkg.dev/<project>/<repository>/<service>:<sha>`).

### Terraform & Prisma migrations

Run the "Infrastructure & Database" workflow to plan/apply infrastructure or roll out schema changes:

1. Run the workflow with `apply=false` to review the Terraform plan artifact.
2. Re-run with `apply=true` (approval required) to apply Terraform and execute `prisma migrate deploy`.
3. Cloud SQL Proxy is started automatically so Prisma connects over localhost.

## Required GitHub configuration

Configure **Repository Secrets**:

| Secret | Description |
| --- | --- |
| `GCP_UI_WORKLOAD_ID_PROVIDER` | Workload Identity Provider resource for UI deployments |
| `GCP_UI_SERVICE_ACCOUNT` | Service account email with Firebase deploy & Secret Manager access |
| `GCP_SERVICE_WORKLOAD_ID_PROVIDER` | WIF provider for backend deployments/tests |
| `GCP_SERVICE_SERVICE_ACCOUNT` | Service account for Artifact Registry, Cloud Run, Secret Manager |
| `GCP_INFRA_WORKLOAD_ID_PROVIDER` | WIF provider for Terraform/migrations |
| `GCP_INFRA_SERVICE_ACCOUNT` | Service account with IAM roles for Terraform + Cloud SQL |
| `BACKEND_TEST_DATABASE_URL` | Optional local/test DB connection string for PR checks (leave empty to fall back to Secret Manager) |

Configure **Repository Variables** (Settings → Secrets and variables → Actions → Variables):

| Variable | Example value | Purpose |
| --- | --- | --- |
| `GCP_PROJECT_ID` | `estate-guide-prod` | Default project ID |
| `FIREBASE_PROJECT_ID` | `estate-guide-prod` | Firebase CLI target project |
| `FIREBASE_PREVIEW_TARGET` | `estate-guide-preview` | Hosting target name for preview |
| `FIREBASE_STAGING_TARGET` | `estate-guide-staging` | Hosting target name for staging |
| `FIREBASE_PROD_TARGET` | `estate-guide-prod` | Hosting target name for production |
| `FIREBASE_STAGING_HOSTNAME` | `staging.example.com` | Used for environment URL metadata |
| `FIREBASE_PROD_HOSTNAME` | `www.example.com` | Used for environment URL metadata |
| `UI_PREVIEW_ENV_SECRET` | `ui-env-preview` | Secret Manager name with preview Vite env JSON |
| `UI_STAGING_ENV_SECRET` | `ui-env-staging` | Secret Manager name with staging Vite env JSON |
| `UI_PROD_ENV_SECRET` | `ui-env-prod` | Secret Manager name with prod Vite env JSON |
| `CLOUD_RUN_REGION` | `asia-south1` | Cloud Run region |
| `ARTIFACT_REPOSITORY` | `services` | Artifact Registry repository name |
| `CLOUD_RUN_SERVICE_NAME` | `estate-guide-api` | Cloud Run service name |
| `SERVICE_STAGING_ENV_SECRET` | `service-env-staging` | Secret Manager name with staging env JSON |
| `SERVICE_PROD_ENV_SECRET` | `service-env-prod` | Secret Manager name with prod env JSON |
| `SERVICE_STAGING_SECRET_REFS` | `DATABASE_URL=prisma-db-staging:latest` | `--set-secrets` mappings passed during deploy |
| `SERVICE_PROD_SECRET_REFS` | `DATABASE_URL=prisma-db-prod:latest` | Secret mappings for production |
| `SERVICE_STAGING_DB_SECRET` | `prisma-db-staging` | Connection string secret for tests |
| `SERVICE_PROD_DB_SECRET` | `prisma-db-prod` | Connection string secret for deploys |
| `PRISMA_STAGING_DB_SECRET` | `prisma-db-staging` | Connection string secret for Terraform workflow |
| `PRISMA_PROD_DB_SECRET` | `prisma-db-prod` | Production connection secret |
| `CLOUD_SQL_INSTANCE_CONNECTION` | `project:region:instance-staging` | Instance connection string used by proxy |
| `CLOUD_SQL_INSTANCE_CONNECTION_PROD` | `project:region:instance-prod` | Production instance connection string |
| `STAGING_SERVICE_URL` | `service-staging-xyz.a.run.app` | Staging Cloud Run URL |
| `PRODUCTION_SERVICE_URL` | `service-prod-xyz.a.run.app` | Production Cloud Run URL |

> Replace example values with your actual project configuration.

### Secret Manager payloads

Secrets referenced above should contain JSON objects, for example:

```json
{
	"VITE_API_BASE": "https://api.example.com",
	"VITE_ANALYTICS_ID": "G-XXXXXXX"
}
```

Workflows transform this JSON into `.env.production` (UI) or `service-env.cfg` (backend) files.

Database connection secrets are expected to contain a single PostgreSQL connection string (no JSON), e.g.

```
postgresql://user:password@127.0.0.1:5432/estate?schema=public
```

### Workload Identity Federation

Each service account referenced by the secrets above must:

1. Trust the GitHub OIDC provider (Workload Identity Pool → Provider → allow repository).
2. Have the necessary IAM roles:
	 - UI: `Firebase Hosting Admin`, `Secret Manager Secret Accessor`.
	 - Service: `Cloud Run Admin`, `Artifact Registry Writer`, `Secret Manager Secret Accessor`, `Cloud Build Service Account` (if using remote builds).
	 - Infra: `Cloud SQL Admin`, `Compute Network Admin`, `Secret Manager Admin`, `Artifact Registry Admin` (tailor to actual modules).

## Terraform state backend

`infrastructure/terraform/backend.tf` is preconfigured for a GCS bucket named `estate-guide-terraform-state`. Create the bucket (enable versioning + uniform access) or update the file with your preferred bucket/prefix.

Each environment has a `.tfvars` file under `infrastructure/terraform/env/`. Update these with real IDs before running the Terraform workflow.

## Helper scripts

- `scripts/firebase-deploy.sh` – wraps Firebase CLI for staging/prod deploys and preview channels.
- `scripts/cloud-run-deploy.sh` – reduces boilerplate around `gcloud run deploy`.
- `scripts/prisma-migrate.sh` – executes `prisma migrate deploy` with secrets read from file/env.

Make sure the scripts are executable locally:

```bash
chmod +x scripts/*.sh
```

## Rollback & observability

- **UI**: Use `firebase hosting:rollback <channel>` or redeploy the previous release channel.
- **Backend**: Revert to an earlier revision with `gcloud run services update --revision <old-revision> <service>`.
- **Migrations**: Rollbacks require a new Prisma migration. For emergency response, restore from a Cloud SQL backup snapshot.
- **Monitoring**: Cloud Run and Cloud SQL feed logs to Cloud Logging; configure alerts in Cloud Monitoring as needed.

## Useful commands

```bash
# Front-end quality gates
npm run lint
npm run build

# Backend quality gates
cd server
npm run lint
npm run test
npm run build

# Build API container locally
docker build -t estate-guide-api:dev -f server/Dockerfile server

# Run Prisma migrations manually
./scripts/prisma-migrate.sh --database-url "postgresql://..."
```

---

For questions about the pipeline or improvements, check `.github/workflows/` or open an issue in this repository.
