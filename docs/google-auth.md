# Google OAuth setup for ResusSkills

Follow these steps to enable Google Sign-In for the app.

1. Google Cloud Console
   - Open https://console.cloud.google.com/apis/credentials
   - Create or select a project.
   - Go to "OAuth consent screen" and configure the app name and authorized domains (for localhost you can set it to `localhost`).
   - Under "Credentials" click "Create Credentials" → "OAuth client ID".
   - Choose "Web application" and set the redirect URI to:

     `http://localhost:3000/api/auth/callback/google`

   - Save and copy the `Client ID` and `Client secret`.

2. Environment variables
   - Open (or create) `.env.local` in the project root and set:

     ```env
     AUTH_GOOGLE_ID=your_google_client_id
     AUTH_GOOGLE_SECRET=your_google_client_secret
     AUTH_SECRET=a_long_random_string_here
     MONGODB_URI=your_mongodb_connection_string
     NEXT_PUBLIC_APP_URL=http://localhost:3000
     ```

   - `AUTH_SECRET` can be generated with: `openssl rand -base64 32` (or any secure random generator).

3. Test locally
   - Restart the dev server if running.
   - Visit the login or register pages and click "Connexion avec Google" / "Inscription avec Google".

4. Production
   - When deploying, add the production redirect URI (e.g., `https://yourdomain.com/api/auth/callback/google`) in Google Cloud Console and set the same env vars in your hosting provider.

5. Troubleshooting
   - If you get an error about redirect_uri_mismatch, double-check the redirect URIs in the Google Cloud Console and `NEXT_PUBLIC_APP_URL`.
   - Check server logs for details and ensure `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` are correct.
