# Documents And Ideas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Tai lieu` module reader/editor, an `Idea` link board, and remove the noisy Supabase sync success toast.

**Architecture:** Extend the existing static app state with `documents` and `ideas`, then add render and event binding functions in `app.js`. Keep persistence inside localStorage plus the existing Supabase `app_state` payload.

**Tech Stack:** Plain JavaScript, HTML generated in `app.js`, CSS in `styles.css`, Node built-in test runner for static regression checks.

---

### Task 1: Regression Test

**Files:**
- Create: `tests/app-feature-regression.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a Node test that reads `app.js` and asserts that the requested pages, state keys, editor commands, and removed toast behavior exist.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/app-feature-regression.test.mjs`

Expected: FAIL because the app does not yet contain `documents`, `ideas`, document editor bindings, and the Supabase success toast is still present.

### Task 2: App State And Rendering

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add state and seed data**

Add `documents`, `ideas`, `selectedDocumentId`, and seed helpers. Include both arrays in remote collect/apply and `writeAll()`.

- [ ] **Step 2: Add pages**

Add `documents` and `ideas` to the `pages` array and route table.

- [ ] **Step 3: Render document modules**

Implement `renderDocuments()` with a master-detail layout and click-to-open document list.

- [ ] **Step 4: Render ideas**

Implement `renderIdeas()` with a form and cards containing title, URL, thumbnail, note, open/copy/delete actions.

### Task 3: Editor Behavior

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Implement reusable rich editor controls**

Add document editor toolbar and context menu commands for bold, italic, underline, unordered list, ordered list, heading, quote, clear formatting, and link/image insertion where practical.

- [ ] **Step 2: Preserve selection**

Use `mousedown.preventDefault()` on toolbar/context menu controls so the editor selection remains active while commands run.

- [ ] **Step 3: Persist edits**

On document title/type/summary/source/content input, write the updated `documents` array to localStorage and schedule remote save.

### Task 4: Remove Noisy Toast

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Remove Supabase load success toast**

Delete the success toast call after remote payload is applied. Leave error toasts and explicit user-action toasts intact.

### Task 5: Verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add test script**

Add `"test": "node --test tests/*.test.mjs"`.

- [ ] **Step 2: Run automated test**

Run: `npm.cmd test`

Expected: PASS.

- [ ] **Step 3: Run app locally**

Run: `npm.cmd run dev`

Expected: dev server prints a local URL.

- [ ] **Step 4: Browser verification**

Open the local URL and verify:

- `Tai lieu` is visible in sidebar.
- Clicking a document opens it immediately.
- Editing title/content persists after page switch.
- Selecting text and right-clicking shows the editor menu.
- `Idea` cards show title, URL, and thumbnail.
- Supabase success sync toast no longer appears.
