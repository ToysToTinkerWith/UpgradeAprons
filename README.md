# Upgrade Aprons

Next.js app configured with Firebase Analytics and Firebase Hosting.

## Getting Started

Install dependencies, then run the local development server:

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Firebase

Firebase config lives in `.env.local` as `NEXT_PUBLIC_FIREBASE_*` values.
Analytics is initialized by `src/components/FirebaseAnalytics.tsx`, which only runs in the browser.

Sign in to Firebase:

```sh
npm run firebase:login
```

Preview Firebase Hosting locally:

```sh
npm run preview
```

Deploy to Firebase Hosting:

```sh
npm run deploy
```

Next builds a static export into `out`, and `firebase.json` serves that folder.

## Restoring This Backup

The repository includes the application, static images, product catalog defaults,
Firebase functions and rules, photo-intake sources, mask profiles, and verification
scripts. It does not contain credentials, installed dependencies, build output,
temporary previews, or live Firebase database and Storage contents.

1. Clone the repository and run `npm ci` in the project directory.
2. Create `.env.local` using the keys in `.env.example` and your Firebase project settings.
3. Run `npm run dev` to preview, or `npm run build` to recreate the static site.
4. For email functions, run `npm --prefix functions ci` and configure the email
   environment values listed in `functions/.env.example` through your existing
   private deployment configuration.
5. Authenticate with the intended Firebase account before deploying. `.firebaserc`
   and `firebase.json` identify the existing Upgrade Aprons project and hosting site.

Owner-edited website text and current products live in Firestore. Restoring this
repository alone does not restore that database; keep Firebase data and any
Storage uploads backed up separately. Do not run catalog-replacement scripts as
part of a routine restore, since they can modify live product records.
