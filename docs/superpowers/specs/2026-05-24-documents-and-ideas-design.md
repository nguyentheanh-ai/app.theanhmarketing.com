# Documents And Ideas Design

## Goal

Add two practical workspace areas to the dashboard:

- `Tai lieu`: a document/module library where the user can open a module and read it immediately.
- `Idea`: a saved-link board with title, URL, and a small thumbnail.

Also remove the noisy Supabase sync toast that says remote data was updated or synced from the database.

## Current Context

The app is a static HTML/CSS/JS dashboard. State is stored in localStorage and optionally synced as one JSON payload in the Supabase `app_state` table. Existing Notes and Course editor patterns already provide the right local model for the new feature.

## Architecture

Use the existing single-file app pattern. Add `documents` and `ideas` arrays to the existing state payload, localStorage persistence, and Supabase payload. Add two sidebar pages and render functions:

- `renderDocuments()`: master-detail document reader/editor.
- `renderIdeas()`: card/grid link library.

No new Supabase table is required for this version.

## Document Module Behavior

Each document module stores:

- `id`
- `title`
- `type`: `Doc`, `Sheet`, `PDF`, `Link`, or `Giao trinh`
- `summary`
- `sourceUrl`
- `content`
- `updatedAt`

The documents page shows a list of modules. Clicking a module selects it and immediately shows its content in the reader/editor area. The selected document supports basic editing:

- title edit
- type edit
- summary edit
- source URL edit
- rich text content edit
- delete
- copy content
- open source link in a new tab

The rich text editor uses `contenteditable`. Formatting buttons act on the current selection. The right-click menu appears when the user selects text inside the editor, then right-clicks that selection. The menu includes common document actions: bold, italic, underline, unordered list, ordered list, heading, quote, and clear formatting.

## Idea Behavior

Each idea stores:

- `id`
- `title`
- `url`
- `thumbnail`
- `note`
- `createdAt`

The ideas page lets the user add a link, title, thumbnail URL, and note. Cards show a small thumbnail next to the title and link. Empty thumbnails fall back to a compact visual placeholder. Cards support open, copy link, and delete.

## Toast Behavior

Do not show a success toast after loading data from Supabase. Keep error toasts and user-action toasts.

## Testing

Use a static Node test to guard the requested product surface in this no-build app:

- pages include `documents` and `ideas`
- remote state includes documents and ideas
- document page has click-to-open detail behavior
- document editor exposes rich formatting and right-click menu commands
- Supabase success sync toast is absent

Manual browser verification will cover layout, click behavior, and editor context menu.
