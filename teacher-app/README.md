# Lesson Planner — MVP for novice teachers

> Plan a lesson in 10 minutes. Find an activity in 30 seconds. Get a script
> for any classroom problem in one click. Built for first- and second-year
> teachers who don't have time to overthink it.

A simple web application. No account, no server, no tracking. Everything
is saved in your browser.

## Features

- **Lesson plan builder** — an 8-step wizard that captures basics, objective,
  materials, hook, main activity (I do / We do / You do), check for
  understanding, wrap-up & homework, and a final review.
- **Weekly planner** — a Mon–Fri grid with rows for topic, objective, main
  activity, assessment, materials, and homework. Plus a progressive-thread
  field, photocopy list, and Friday reflection.
- **Activity suggestion tool** — 15 ready-to-use classroom activities, filterable
  by time, group size, and purpose. Each activity has setup steps, a common
  mistake to avoid, and a worked example.
- **Classroom problem solver** — 10 common situations (student on phone,
  open disrespect, lesson flopped, going home overwhelmed, etc.) each with
  what NOT to say, what to say instead, and what to do next.
- **Print / Export to PDF** — every lesson, week, activity, and problem has
  a Print button. Use your browser's print dialog → "Save as PDF" to export.

## How to run it locally

You need a way to serve the folder over HTTP. Pick whichever you have:

### Option 1 — Python (already on macOS and most Linux)

```sh
cd teacher-app
python3 -m http.server 8000
```

Open <http://localhost:8000> in your browser.

### Option 2 — Node (if you have npx)

```sh
cd teacher-app
npx serve
```

It will print a local URL. Open it.

### Option 3 — VS Code

Install the "Live Server" extension, right-click `index.html`, choose
"Open with Live Server".

### Option 4 — Just open the file

In modern browsers you can double-click `index.html`. localStorage works on
`file://`. Some features (back button history) feel a bit cleaner over
HTTP, but the app is fully functional opened directly.

## How to use it

1. Open the app. You start on the **Dashboard**.
2. Click **+ New lesson plan** to walk through the 8-step wizard.
3. Click **+ New week** to plan a Monday-to-Friday grid.
4. Browse **Activities** when you're stuck for what to do tomorrow.
5. Open **Problem Solver** when something happens in class and you don't
   know what to say.
6. Click **🖨 Print / PDF** anywhere to print or save as a PDF (your browser
   handles the PDF — no extra software needed).

## File structure

```
teacher-app/
├── README.md       — this file
├── index.html      — the app shell (header, nav, main, footer)
├── app.css         — all styling, including print rules
├── data.js         — static data: 15 activities + 10 problem-solver scripts
├── storage.js      — localStorage wrapper for lessons and weeks
├── views.js        — all page views (dashboard, lessons, weeks, etc.)
└── app.js          — entry point: hash router + bootstrap
```

Plain HTML / CSS / JavaScript. No build step, no bundler, no dependencies.
You can read every file end-to-end in 20 minutes.

## Where your data is

- Lessons: `localStorage` key `tnplanner.lessons.v1`
- Weeks: `localStorage` key `tnplanner.weeks.v1`

Open the browser dev tools → Application → Local Storage to see the JSON
directly. To wipe everything, clear local storage for the page.

The data never leaves your browser. There is no server, no analytics, no
network call.

## Browser support

Tested mentally on the 2026 versions of Chrome, Safari, Firefox, and Edge.
Uses standard ES5/ES6 features that have been supported for ~7+ years. If
you find a browser that does not work, open an issue.

## Limitations of this MVP

- Single device only. Your lessons live in one browser; they do not sync
  across devices. Manual export by printing to PDF.
- No collaboration. One teacher at a time.
- No authentication. Anyone with access to your browser sees your plans.
- No image upload, no rich text. Plain-text fields only.
- No drag-and-drop reordering of activities or weekly cells.

These are deliberate scope limits for an MVP. They are easy to add later
if there is demand.
