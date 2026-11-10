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

The workflow also runs on pushes to `main`; set a GitHub Actions repository
variable named `VITE_API_BASE_URL` to the same URL if you want automatic builds.
The workflow currently creates a debug APK, not a signed Play Store release.

## Google sign-in for web and Android

RentEase uses the Web OAuth client ID for browser sign-in and for verifying ID
tokens on the backend. The Android app uses native Google sign-in and sends its
ID token to the same `/api/auth/google` endpoint.

1. In the same Google Cloud project as the Web client, add
   `https://rentease-14e0.onrender.com` to that Web client's **Authorized
   JavaScript origins**. Keep the Web client ID configured privately as
   `GOOGLE_CLIENT_ID` in Render. Do not put its client secret in the frontend.
2. Create an **Android** OAuth client in that project. Use package name
   `com.rhaineyyy.rentease` and the SHA-1 signing-certificate fingerprint of the
   APK you install. The APK workflow prints its SHA-1 in the
   **Print APK signing certificate fingerprint** step; alternatively, run
   `keytool -printcert -jarfile RentEase.apk` on a downloaded APK. Enter the
   reported SHA-1 in the Android client; do not add `https://localhost` as a
   workaround for the Android WebView origin error.
3. Keep the Web client ID as the backend ID-token audience. The app fetches
   that public ID from `/api/auth/google/config`; the Android OAuth client is
   selected by Google using the package name and APK signing certificate.
4. Build and install a fresh APK, then test Google sign-in on both the website
   and Android app. If you change the APK signing key, register its new SHA-1
   fingerprint in Google Cloud as well.

## Optional integrations

Google sign-in, PayMongo, email, and SMS notifications require provider
credentials. Configure them as private environment variables in the hosting
dashboard; never place them in frontend variables or source control.
