# RAMYS UNI MAIL — LinkedIn recording demo

This branch, `linkedin-post-design`, is a local recording copy of the project. It opens directly into a fictional university inbox after a one-second loading screen. No Google sign-in, Firebase configuration, Firestore access, or real email data is used by the demo.

## Run locally

1. Run `npm ci` if dependencies are not installed.
2. Run `npm run dev` and open the local URL printed by Vite.

No `.env.local` is needed. Existing Firebase environment settings are ignored by the demo entry point. For a production-style recording, run `npm run build` followed by `npm run preview`.

## What to demonstrate

- Hover, focus, or click a purple course code in a subject, preview, or message body to reveal its course name.
- Search for a course code such as “CSEN 501” or a keyword such as “quiz”. Matching terms are highlighted in the results and reader.
- Use an eye button to collapse a message, then show it again.
- Open the book button on desktop to edit course names. Save applies the changes immediately in this browser session.
- Open the Arabic library announcement to show right-to-left message support.

The top-right reset button restores all eight sample messages, original course names, and the initial selection, and clears the search. Reloading the page also resets the demo and replays the one-second startup. No changes are persisted to browser storage or any server.

## Recording data and privacy

All messages in `src/demoData.js` were written as fictional examples. Sender and recipient addresses use `university.example`. The demo reuses the original UI and client-side search, course annotation, and visibility behavior. Its entry point does not import any Firebase modules. The original Firebase helper files remain in the repository for reference; they are not included in the demo bundle. System fonts avoid external font requests during recording.

Run `npm test` and `npm run build` to verify the project. The private application remains on `main`.
