# GradeLog

A grade-logging web app that runs entirely in the browser — no account, no server, no setup. Record your courses and grades and keep a running log of how you are doing.

Built by a PharmD student at the University of Benin for tracking his own grades across semesters, instead of keeping them scattered across notebooks and spreadsheets.

## Features

- **Year → semester → course tree** — organise courses by academic year and semester, with years and semesters that expand and collapse. Add whole years (up to 6, for a 6-year programme) and remove a year — removal can be undone within 5 seconds, and the last remaining year can't be removed.
- **Course entries** — each course has a code (e.g. PCL 201), credit units (1–12, default 3), and a letter grade (A–F), or "—" for a course with no grade yet. There is no separate course-title field.
- **Active / Planned semesters** — each semester toggles between Active and Planned. Only courses in Active semesters count toward your CGPA, so planned semesters don't affect it yet; ungraded courses don't count either.
- **CGPA and GPA calculation** — live CGPA across all active courses, plus a GPA per year and per semester, with total units counted. The formula is the weighted average Σ(units × grade points) ÷ Σ(units), counting only graded courses in Active semesters.
- **Two grading scales** — switch between the 5.0 Nigerian scale (A=5, B=4, C=3, D=2, E=1, F=0) and the 4.0 US scale (A=4, B=3, C=2, D=1, F=0). On the 5.0 scale your class is shown too: First Class (≥4.50), Second Class Upper (≥3.50), Second Class Lower (≥2.40), Third Class (≥1.50), Pass (≥1.00), Below Pass Mark (<1.00). On the 4.0 scale: Summa Cum Laude (≥3.85), Magna Cum Laude (≥3.50), Cum Laude (≥3.00), Satisfactory (≥2.00), Pass (≥1.00), Fail (<1.00).
- **Calculators** — four built-in calculators:
  - **Target** — enter the CGPA you want and see what grades you need in your remaining courses to reach it.
  - **What-If** — simulate grades for upcoming courses and see the resulting CGPA.
  - **Projections** — project your CGPA from an expected average over a number of units.
  - **Best/Worst** — see the best and worst CGPA outcomes for your remaining courses.
- **Reports** — a "Statement of Academic Record" view of your full record, or of a single year or semester, opened in a new tab and printed or saved as PDF from the browser's Print dialog.
- **Search** — find courses by code or text, with matching terms highlighted.
- **Settings** — set your name, matric number, and institution (shown on the record), plus the grading scale and theme. A Danger Zone offers Reset all data, which permanently deletes everything and requires typing DELETE to confirm.
- **Edit and delete with undo** — edit any course, or delete one and undo it within 5 seconds.
- **Google Drive sync** — optional push/pull backup to a Drive folder, using your own Google OAuth Client ID.
- **CSV export and import** — export all courses to CSV (columns: Year, Semester, Active, CourseCode, Units, Grade, GradePoint) and import the same format back.
- **JSON backup and restore** — back up all data to a file, and restore it later either by merging with the current data or replacing everything.
- **Light and dark themes** — toggle from the header; your choice is remembered.
- **Installable as a PWA** — ships with `manifest.json`, a service worker (`sw.js`), and an app icon (`icon.svg`), so it can be added to a phone or desktop home screen and keep working offline. An install banner appears when the browser offers installation, and an offline banner ("You're offline — changes will still save locally") shows when the connection drops.
- **View-only demo mode** — opening the app with `?view=1` loads built-in sample data in a read-only "View Only" mode, so the app can be previewed without touching your own grades.
- **Local, on-device storage** — a dedicated `storage.js` module handles saving data (`gradelog.data.v1` in localStorage), and there is no server-side component in the repo, so grades are stored in the browser on the device itself.

## Getting started

No installation or build step is needed.

1. Open `index.html` in a modern browser, or serve the folder with any static file server.
2. Add your courses and grades.

To install it as an app: open the hosted version in a mobile or desktop browser and use the browser's "Add to Home screen" / "Install app" option.

## Tech stack

- HTML (`index.html`)
- CSS (`styles.css`)
- Vanilla JavaScript (`app.js`, plus a separate `storage.js` for data persistence)
- Progressive Web App: Web App Manifest (`manifest.json`) + Service Worker (`sw.js`)

No build tools and no bundled JavaScript framework. The page does load a few resources from CDNs at runtime: Google Fonts (Sora, IBM Plex Sans), Font Awesome 6.5.1 icons, and the Google API / Google Identity Services scripts used for Drive sync — so fonts, icons, and Drive sign-in need an internet connection, while the core grade logging works offline once installed.

## Project structure

```text
GradeLog/
├── index.html      # the app's single page
├── app.js          # application logic (~104 KB)
├── storage.js      # data persistence layer (~11 KB)
├── styles.css      # styling (~51 KB)
├── manifest.json   # PWA manifest (name, icons, display mode)
├── sw.js           # service worker (offline support)
└── icon.svg        # app icon
```

## Status

Working static app. Features, grade scales, and class bands are verified from the source code.
