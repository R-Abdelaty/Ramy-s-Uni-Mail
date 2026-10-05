# GUC Mail Viewer

A React and Vite viewer for a personal email archive stored in Cloud Firestore. Google sign-in identifies the visitor; published Firestore security rules decide who can read messages. The source can be public while the inbox stays private.

## Features

- Search and read archived messages, with a refresh button for new imports.
- Display email HTML in a sandboxed frame that blocks scripts and external email resources.
- Save hide/show preferences in one shared Firestore document, so they stay the same across both approved Google accounts, devices, and sessions. Existing browser-local preferences are migrated on the next sign-in.
- Open the shared course-code table with the desktop book button. Its floating panel keeps the mail layout centered. Saved names sync through `userPreferences/shared` and appear when hovering, focusing, or tapping a highlighted code in the inbox or a message. The editor is hidden on mobile, where saved popovers remain available.

## Run locally

1. Run `npm ci` in this folder.
2. Copy `.env.example` to `.env.local` and fill all four `VITE_FIREBASE_*` values from your Firebase web app configuration. `VITE_FIRESTORE_EMAIL_COLLECTION` defaults to `emails`.
3. Enable Google sign-in in Firebase Authentication and authorize `localhost` for local development.
4. Publish the rules in `firestore.rules` from Firebase Console. They allow the listed verified accounts to read email documents, deny browser writes to email documents, and let those accounts read/write the shared `userPreferences/shared` document.
5. Run `npm run dev`.

The app expects documents in the `emails` collection with a `title`, `date`, and either `body` or `html_body`. A separate private retrieval process imports messages into Firestore; its credentials and email data are not part of this viewer repository.

## Deploy with Cloudflare Pages

Connect this viewer repository to Cloudflare Pages. Use `npm run build` as the build command and `dist` as the output directory. Set all four `VITE_FIREBASE_*` build variables using your Firebase web app configuration, then add the Pages domain to Firebase Authentication's authorized domains. Confirm that the published Firestore rules allow only your intended accounts to read the archive.

Firebase web configuration is included in the browser bundle and is not an access-control secret. Never put a service-account key, mailbox password, or email export in this project or a `VITE_` variable. Public visitors can view the app shell, but they cannot read the private archive unless Firestore rules allow their account.

Run `npm test` for the viewer checks and `npm run build` to verify the production bundle. Inspect `dist` before deployment to ensure it contains no email export.
