# Testo Home — Deployment & Operations Guide

## 1. Environment Variables
Configure the following variables in your hosting environment (or `.env` locally; never commit secrets):
- `APP_URL`: Public HTTPS origin where Testo Home is hosted.
- `RAZORPAY_KEY_ID`: Merchant Key ID from Razorpay Dashboard (server-only).
- `RAZORPAY_KEY_SECRET`: Merchant Key Secret from Razorpay Dashboard (server-only, used for HMAC-SHA256 verification).
- `VITE_RAZORPAY_KEY_ID`: Public Razorpay Key ID for client checkout initialization.

## 2. Firebase Configuration & Security Rules
1. `firebase-applet-config.json` contains your Firebase Web SDK project configuration (`projectId`, `apiKey`, `authDomain`, `firestoreDatabaseId`, `storageBucket`).
2. Ensure **Google Sign-In** is enabled under Firebase Console → Authentication → Sign-in method, and add your production domain to **Authorized Domains**.
3. Deploy the hardened security rules in `firestore.rules`:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. For **Firebase Storage** PDF report uploads, deploy Storage rules restricting `/reports/{userId}/{fileName}` reads strictly to `request.auth.uid == userId` or verified admins, and writes strictly to verified admins.
5. **Pre-Launch Operational Gate**: Real diagnostic bookings remain in Demo Preview mode until an authorized administrator verifies **Laboratory Partner**, **Collection Staff**, **Verified Pricing**, **Service Locations**, and enables **Accept Live Bookings** inside the Admin Console (`settings/operations`).

## 3. Razorpay Server-Side Payment Verification
- `POST /api/payments/create-order` verifies the user's Firebase ID token (`Authorization: Bearer <token>`) and creates a Razorpay Order server-side using `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
- `POST /api/payments/verify` computes an HMAC-SHA256 digest of `${razorpay_order_id}|${razorpay_payment_id}` with `RAZORPAY_KEY_SECRET` and compares using `crypto.timingSafeEqual`. Orders are never marked paid solely from a frontend response.

## 4. Vercel Deployment
1. Push this repository to GitHub/GitLab/Bitbucket and import into **Vercel**.
2. Set Build Command: `npm run build`, Output Directory: `dist`.
3. Add environment variables (`APP_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `VITE_RAZORPAY_KEY_ID`) in Vercel Project Settings.
4. For API routes (`/api/*`) on Vercel serverless, or full Node server hosting, deploy `server.ts` on Node-compatible runtimes (e.g., Cloud Run / Render / Railway) or map `/api/*` endpoints to Vercel Serverless Functions.

## 5. Netlify Deployment
1. Connect your repository in **Netlify**.
2. Build command: `npm run build`, Publish directory: `dist`.
3. Add a `_redirects` rule (`/* /index.html 200`) for SPA fallback, and configure `netlify/functions/` if hosting `/api/*` serverless endpoints on Netlify.
4. Add your Netlify domain to Firebase Authentication → Authorized Domains.

## 6. PWA Installation
- Configured via `vite-plugin-pwa` with `registerType: 'autoUpdate'`, full `manifest.webmanifest`, `192x192` + `512x512` + `maskable` icons, and `apple-touch-icon.png`.
- On **Android / Chrome / Edge**, click **Install App** in the sidebar/login card or accept the browser install prompt.
- On **iOS Safari**, tap **Share → Add to Home Screen**.
