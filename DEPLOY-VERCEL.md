# Deploying Estate Guide to Vercel

Production runs as **two Vercel projects from this one repo**, with **Neon Postgres** for data and **Cloudflare R2** for uploaded files:

```
Browser ──> estate-guide-web (Vercel, repo root, Vite SPA)
              │  /api/*  rewritten (vercel.json) to ──┐
              ▼                                        ▼
          static site                    estate-guide-api (Vercel, server/, NestJS, region sin1)
                                           │                     │
                                Neon Postgres (Singapore)   Cloudflare R2 (images, brochures)
Admin uploads go browser ──PUT──> R2 directly (presigned URL), then the API records them.
```

Why it's set up this way:

- **Same domain for site and API.** The web project forwards `/api/*` to the API project, so the browser only ever talks to your domain. Login cookies work with `SameSite=Lax` and no CORS workarounds.
- **Singapore.** Neon has no Mumbai region, so the database is in `aws-ap-southeast-1` and the API functions are pinned to `sin1` next to it (`server/vercel.json`). Keep the two together: every API request makes several database queries.
- **Files in R2, not Postgres.** Vercel caps a function's request and response at 4.5 MB. Uploads go straight from the browser to R2, and `/api/v1/files/<id>` answers with a redirect to the R2 URL, so links already stored in the database keep working.
- **Migrations run during the API's production build** (`server/scripts/vercel-build.cjs`), over Neon's direct connection. Preview builds skip them unless `RUN_MIGRATIONS=true`.

Plans: the site is commercial, so Vercel needs the **Pro** plan. Check Neon's and R2's plan limits against your data size.

---

## 1. Create the Neon database

1. In the Neon console, create a project in **AWS Asia Pacific (Singapore)**. Choose **Postgres 16** to match the local database.
2. From **Connect**, copy two connection strings:
   - **Pooled** (connection pooling on, host contains `-pooler`). Add `&pgbouncer=true&connect_timeout=15` to the end. This becomes `DATABASE_URL`.
   - **Direct** (pooling off). This becomes `DIRECT_URL`, and is the one used for copying data and running migrations.
3. Leave the database empty. The copy script refuses to run into a database that already has tables.

## 2. Create the R2 bucket

1. Cloudflare dashboard → **R2** → **Create bucket**, e.g. `estate-guide-files`.
2. **Public access:** connect a custom domain such as `files.yourhomesearch.co.in` (Settings → Custom Domains). The `r2.dev` URL works for testing but is rate-limited.
3. **CORS policy** (Settings → CORS) so the admin can upload from the browser:
   ```json
   [
     {
       "AllowedOrigins": [
         "https://www.yourhomesearch.co.in",
         "https://yourhomesearch.co.in",
         "https://estate-guide-web.vercel.app",
         "http://localhost:5173"
       ],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. **API token:** R2 → Manage API tokens → Create → *Object Read & Write*, limited to this bucket. Note the **Access Key ID**, **Secret Access Key** and your **Account ID**.

## 3. Copy the data from local Docker

Do steps 3 to 6 in one sitting. Anything saved on the local site after step 3.2 won't be in Neon (if that happens, repeat into a fresh Neon branch).

1. Make sure the local database is running:
   ```powershell
   docker compose -f docker-compose.local.yml up -d db
   ```
2. Copy everything except file bytes into Neon (PowerShell, from the repo root):
   ```powershell
   ./scripts/db/copy-local-to-neon.ps1 -NeonDirectUrl "<Neon direct connection string>"
   ```
   It prints row counts at the end. Compare them with your local database.
3. Install the new server dependencies and apply the one new migration to Neon:
   ```powershell
   cd server
   npm install
   $env:DATABASE_URL = "<Neon direct connection string>"
   npx prisma migrate deploy
   Remove-Item Env:DATABASE_URL
   ```
4. Move the files to R2. Create `server/.env.migrate` (git ignores it):
   ```
   SOURCE_DATABASE_URL=postgresql://estate:estatepass@localhost:5433/estateguide
   DATABASE_URL=<Neon direct connection string>
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=estate-guide-files
   R2_PUBLIC_URL=https://files.yourhomesearch.co.in
   ```
   Then, from `server/`:
   ```powershell
   node --env-file=.env.migrate -r ts-node/register scripts/copy-files-to-r2.ts
   ```
   It's safe to re-run if anything fails. Delete `.env.migrate` when you're done.

## 4. Create the API project on Vercel

1. Merge the `vercel-migration` branch into `main` and push. (The live site keeps running from your machine until DNS changes in step 6.)
2. Vercel → **Add New → Project** → import `rahulpartyzone/estate-guide`.
   - Project name: `estate-guide-api`
   - Root Directory: `server` (framework: NestJS)
   - Build settings come from `server/vercel.json`.
3. Environment variables (Production):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon **pooled** string (with `pgbouncer=true`) |
   | `DIRECT_URL` | Neon **direct** string |
   | `JWT_SECRET`, `JWT_REFRESH_SECRET` | new long random values (`openssl rand -hex 32`) |
   | `COOKIE_SAMESITE` | `Lax` |
   | `COOKIE_SECURE` | `true` |
   | `CORS_ORIGIN` | `https://www.yourhomesearch.co.in,https://yourhomesearch.co.in` |
   | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | from step 2 |
   | `MSG91_AUTH_KEY`, `MSG91_TOKEN_AUTH`, `MSG91_WIDGET_ID`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_ID` | your MSG91 values |
   | `APP_BASE_URL` | `https://www.yourhomesearch.co.in` |
   | `INVITE_EMAIL_PROVIDER`, `INVITE_FROM_NAME`, `INVITE_FROM_EMAIL`, `BREVO_API_KEY` | your invite email settings (also used for new-lead alerts; who gets them is set per user in Admin → Users) |

4. Deploy, then open `https://estate-guide-nine.vercel.app/api/v1/healthz`. The build log should show "Applying database migrations" and "No pending migrations".

## 5. Create the web project on Vercel

1. Vercel → **Add New → Project** → the same repo.
   - Project name: `estate-guide-web`
   - Root Directory: `.` (framework: Vite). Build settings come from `vercel.json`.
2. Environment variables: `VITE_MSG91_WIDGET_ID`, `VITE_MSG91_TOKEN_AUTH`. (`VITE_API_BASE=/api/v1` is already in `.env.production`.)
3. If the API project's domain changes, update the destination in `vercel.json` and push.
4. Test on `https://estate-guide-web.vercel.app`:
   - [ ] Home, Projects and a project page load with images
   - [ ] Admin login works and stays logged in after a refresh
   - [ ] Upload an image larger than 5 MB and a brochure PDF in the admin
   - [ ] Brochure download with OTP works on a project page
   - [ ] A site-visit or preference lead shows up under Admin → Leads
   - [ ] In the Neon SQL editor, `select ip, "createdAt" from "BrochureOtp" order by "createdAt" desc limit 5;` shows real visitor IPs, not the same Vercel address on every row. If every row has the same IP, the OTP rate limit is shared by all visitors: tell Claude and the client-IP lookup will be adjusted.

## 6. Switch the domain

1. In `estate-guide-web` → Settings → Domains, add `yourhomesearch.co.in` and `www.yourhomesearch.co.in`.
2. Add the DNS records Vercel shows. If the domain's DNS is on Cloudflare, set those records to **DNS only** (grey cloud), and remove the tunnel's public hostname for the site.
3. Once the site works on your domain, stop the local stack (`docker compose -f docker-compose.local.yml down`). Keep a backup of the local database for a while:
   ```powershell
   docker compose -f docker-compose.local.yml exec -T db pg_dump -U estate -d estateguide -f /tmp/backup.sql
   docker compose -f docker-compose.local.yml cp db:/tmp/backup.sql ./backup-before-vercel.sql
   ```

**Rollback:** point DNS back to the Cloudflare tunnel and start the local stack again. Nothing in steps 1 to 5 changes the local database.

## 7. Afterwards

- **Rotate the secrets that were committed to git** before this migration (the MSG91 keys in the old `.env` files). Old commits still contain them.
- The Google Cloud workflows (`ui-build-deploy.yml`, `service-build-deploy.yml`) now only run when started by hand. Delete them, the Terraform in `infrastructure/`, and the Cloud SQL instance once you're sure you won't go back.
- **Local development is unchanged.** Without the `R2_*` variables, uploads are stored in the local database as before, and `DIRECT_URL` isn't needed.
