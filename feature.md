# Desktop inbox welcome screen

Implemented on the `linkedin-post-design` demo branch. This document describes the change to port into the real application on `main`.

## Behavior

- After startup, desktop shows the inbox on the left and a centered welcome screen in the right panel. No message is selected, highlighted as selected, or rendered in the reader.
- The welcome screen uses the existing mail icon, the heading **Welcome to your inbox**, and the text **Select an email on the left to start reading.**
- Clicking an email opens the existing message reader. Search, course highlighting, hide/show controls, and course-name editing retain their existing behavior.
- Searching before selecting an email shows **Choose a message** and **Select a search result to read it here.** when results exist. It never opens the first result automatically.
- A query with zero results shows **No matching messages** and **Clear your search to return to the inbox.**
- If a search filters out the selected email, its reader disappears. Selection is retained in state, so clearing the filter restores that email if it is still present. Matching results never replace it automatically.
- Reloading starts with the welcome screen again. The demo's reset button also clears selection and returns to the welcome screen.
- On mobile (768px and below), the existing responsive rules show only the inbox until a message is clicked. The welcome panel stays hidden. The Inbox button continues returning to the list and focusing the selected row.

## Exact implementation

Only `src/App.jsx` needs changes for this feature; no new packages, database fields, storage, CSS, or network calls are required.

1. Change the initial selection from index `0` to the explicit unselected value `null`:

   ```jsx
   const [selectedIndex, setSelectedIndex] = useState(null)
   ```

2. Remove the automatic first-result fallback from the derived selection:

   ```jsx
   // Previously: find(...) || visibleEmails[0]
   const selected = visibleEmails.find(({ index }) => index === selectedIndex)
   const selectedEmail = selected?.email
   const hasNoSearchResults = Boolean(query.trim()) && visibleEmails.length === 0
   ```

   Changing initial state alone is insufficient: the old `|| visibleEmails[0]` would still immediately open the first email. The guarded `selectedEmail` also keeps `selectedDocument` empty until an email is explicitly selected, so no email iframe is mounted on the welcome screen.

3. Keep the existing row click handler, which calls `setSelectedIndex(index)` and `setReaderOpen(true)`. Its `is-selected` class and `aria-pressed` already compare each row's index with `selected?.index`, so all rows correctly start unselected.

4. Keep the existing conditional reader rendering: loading state first, message content when `selectedEmail` exists, and the placeholder otherwise. Update the placeholder's heading and description:

   ```jsx
   <div className="reader-placeholder empty-reader">
     <span className="empty-mail-icon" aria-hidden="true"><Mail24Regular /></span>
     <h2>{hasNoSearchResults ? 'No matching messages' : query.trim() ? 'Choose a message' : 'Welcome to your inbox'}</h2>
     <p>{hasNoSearchResults ? 'Clear your search to return to the inbox.' : query.trim() ? 'Select a search result to read it here.' : 'Select an email on the left to start reading.'}</p>
   </div>
   ```

   The zero-results condition must check result count as well as the query. A nonempty query alone does not mean there are no results.

5. Rename the reader article's accessible label from `Selected message` to `Message reader`, since it also contains the welcome state.

6. In the demo's `resetDemo()`, replace `setSelectedIndex(0)` with `setSelectedIndex(null)`. Keep `setReaderOpen(false)` and the other reset actions.

## Layout and accessibility

The existing `.reader-placeholder` rules center its contents horizontally and vertically. `.empty-mail-icon` supplies the existing 72px icon container, and `.reader-placeholder h2` supplies heading typography. The original background, color palette, panel dimensions, and course highlights are preserved.

The existing `@media (max-width: 768px)` rules control the mobile inbox/reader transition through `.reader-is-open`. No viewport detection in JavaScript is needed. `readerOpen` remains `false` on startup. The existing effect focuses the message title only after a message is opened, so startup does not steal keyboard focus from the inbox.

## Porting to the real app

Apply the selection and placeholder changes above to the authenticated app's `src/App.jsx`. Keep its Firebase authentication, archive loading, visibility persistence, and shared course table intact. Do not copy the demo's data imports, reset button, fixed loading delay, or Firebase removal.

The production app's archive loader currently clamps selection with a line equivalent to:

```jsx
setSelectedIndex((current) => snapshot.emails.length ? Math.min(current, snapshot.emails.length - 1) : 0)
```

This must also be changed when porting: `Math.min(null, ...)` becomes `0` and silently selects the first email. Preserve an unselected state explicitly:

```jsx
setSelectedIndex((current) => {
  if (current === null || !snapshot.emails.length) return null
  return Math.min(current, snapshot.emails.length - 1)
})
```

This keeps the welcome state through initial loading and refreshes while preserving the loader's existing clamping behavior after a user selection. Reset selection to `null` and `readerOpen` to `false` when signing out or switching accounts so a different inbox cannot inherit the previous selection.

The current app selects by archive array index. That is preserved here. If a future change must preserve the same email across insertions or reordering on refresh, migrate selection to a stable email ID as a separate change.

## Acceptance checks for handoff

Validation on the demo: `npm run build` passed. Browser checks passed for initial desktop welcome, absent selection/iframe/actions, searches with and without results, opening HTML and plain-text messages, restoring selection after clearing a filter, reset/reload, and mobile open/back navigation. No browser errors were observed. The production Firebase-specific checks below remain part of the future port.

1. Open desktop after startup: welcome screen visible, zero selected rows, no email body iframe or message actions.
2. Open an HTML email and a plain-text email: both display normally, with the selected row and course features working.
3. Reload or reset the demo: return to the welcome screen.
4. Search before selecting: show matching rows and the choose-message prompt without opening a result.
5. Search for a nonexistent phrase: show the no-results state; clear it to restore the welcome screen.
6. Select an email, filter it out, and clear the search: no automatic replacement while filtered; the original selection returns afterward.
7. On mobile, startup shows only the inbox; opening a row and using the Inbox button still works.
8. In the real app, check initial authenticated load, refresh before selection, and account changes: none should auto-select the first email.
