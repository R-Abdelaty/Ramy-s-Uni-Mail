# Site demo edit

Open `http://localhost:3000/MyComp` while Studio is running, or run `npm run dev` from this folder.

The composition is 1920 × 1080 at 60 fps, lasting the full 37.267 seconds. The source recording and audio play continuously. Camera animation runs at 60 fps; the source footage remains its original 30 fps.

| Focus | Main window | Zoom | Text |
| --- | --- | --- | --- |
| Hover over CSEN501 and its translation tooltip | 6–8 s | 2.05× | Subject Code Translation |
| Two email rows and their hide controls | 13–18 s | 2.2× | Hide unwanted mail |
| Search field, typed keyword, and matching email | 24–29 s | 2.45× | Search your mail |

Camera transitions begin approximately one second before each window and return approximately one second afterward. Quintic easing has zero velocity and acceleration at the holds. Scale changes logarithmically and shares a fixed anchor with the pan. Text fades and rises into place, then fades away before the return completes.

Roboto is bundled in `public/fonts` with its license; previews and exports do not need a font service. Titles stay in screen space so the camera does not stretch or crop them. The search title is an editorial addition because the instructions do not specify search text.

Adjust camera times, zoom amounts, and original-video focal coordinates in `focusMoments` in `src/Composition.tsx`. Each title has a separate named Sequence for timing edits in Studio. Font size, panel design, and text animation are in `FeatureLabel`.

When ready to export:

```powershell
npx remotion render MyComp out/mail-demo-edited.mp4 --codec=h264 --crf=16
```

Validation: `npm run lint` checks ESLint and TypeScript. Use Studio to inspect the tooltip around 7.4 s, hiding around 15.9 s, and the matching search result around 28 s.
