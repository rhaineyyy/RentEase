# RentEase deployment and Android connection

The Android app is a client: it must call a backend reachable over the internet.
It cannot use `localhost:5000`, because on Android `localhost` refers to the
phone itself. The Android workflow now requires the public backend URL ending
in `/api`.

## Host the backend and web app

The repository includes a Render Blueprint and Dockerfile. The Docker image
builds the Vue/Ionic frontend and serves it from Express, so the web UI and API
share the same HTTPS origin. The API health check is `/api/health`.

1. Create a managed PostgreSQL database with a provider such as Neon.
2. Take a private backup of the existing database. The repository does not
   include the full initial RentEase schema. Before deploying, restore the
   existing database backup into the hosted database.
   The SQL files under `rentease-backend/schema` are incremental changes, not a
   complete schema. Do not put database dumps or credentials in Git or chat.
3. In Render, create a Blueprint from this repository and privately set
   `DATABASE_URL` to the hosted PostgreSQL connection string. The Blueprint
   generates `SESSION_SECRET` and enables SSL.
4. Wait for the service deployment and confirm `https://<service>/api/health`
   returns a successful database response.

The backend persists login sessions in PostgreSQL. Do not deploy it with the
development session secret or development database credentials.

## Build a connected Android APK

After deploying the backend, open the repository's **Build RentEase Android
APK** GitHub Actions workflow and choose **Run workflow**. Set `api_base_url`
to `https://<service>/api`. The workflow rejects non-HTTPS URLs or URLs that
do not end in `/api`. When the run succeeds, download the `RentEase-APK`
artifact and install the APK from its ZIP file.

The workflow also runs on pushes to `main`. It uses the `VITE_API_BASE_URL`
repository variable when set, otherwise it uses the current production API URL.
The workflow currently creates a debug APK, not a signed Play Store release.

## Optional integrations

Google sign-in, PayMongo, email, and SMS notifications require provider
credentials. Configure them as private environment variables in the hosting
dashboard; never place them in frontend variables or source control.

## Password reset mail

The password reset endpoints require `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `EMAIL_FROM`, and `APP_PUBLIC_URL` in the backend environment.
Use a verified sender address and the public frontend origin for
`APP_PUBLIC_URL`. Never commit SMTP credentials.

After deploying the backend code, run
`npm run migrate:password-reset` from `rentease-backend` against the production
database, or apply `rentease-backend/schema/password-reset-tokens.sql` using the
database provider's SQL console. The migration only creates the reset-token
table and index.
