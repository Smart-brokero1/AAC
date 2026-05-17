# AAC

## Persistence and Firebase Storage

This project supports shipment persistence locally and with Firebase Firestore.

### Explicit Firebase project binding

- The backend is configured to use Firestore project `fdxx-13207` by default.
- The Firestore collection is `fdx` and the document is `shipments`.
- A `/api/health` endpoint is available to verify backend connectivity and Firebase availability.

### Local development

- The app writes `shipments.json` to the project root for local fallback.
- Backend environment variables are loaded with `dotenv` locally.
- Use `.env` to override `ADMIN_PASSWORD` and Firebase credentials.

### Production persistence with Firebase

- Set `FIREBASE_SERVICE_ACCOUNT` in your environment variables as a JSON string.
- Or use `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` separately.
- `FIREBASE_PROJECT_ID` defaults to `fdxx-13207` when not explicitly provided.
- When Firebase credentials are available, the backend stores and loads shipment data from Firestore.
- Without Firebase credentials, the app falls back to local `shipments.json`.

### Frontend Firebase client support

- This release does not use client-side Firestore in production.
- All data writes and reads are handled securely through the backend service.
- Frontend Firebase is not required for the current deployment.

### Setup

1. Copy `.env.example` to `.env` for local development.
2. Add Firebase credentials to your `.env` or Vercel environment variables.
3. Deploy with `npx vercel --prod --yes`.
