# AssignTrack

AssignTrack is a responsive student assignment dashboard with a dependency-free browser frontend and a Node.js backend. The repository's only committed revision contained a placeholder README; no original application stack was recoverable from Git. The current implementation preserves the dashboard UI and adds a small server-side persistence and authentication foundation.

## Run

Start the full-stack development server:

```bash
npm install
npm run dev
```

Then open `http://localhost:4173` in a browser. Demo access is prefilled on the sign-in screen:

- Email: `shahbazanjum8888@gmail.com`
- Password: `student123` (development seed password)

## Included

- Student-only session gate with logout and protected dashboard routes.
- Responsive navigation for dashboard, assignments, subjects, submissions, grades, calendar, notifications, profile, and settings.
- Assignment search, subject/status filters, sorting, assignment details, deadline-aware statuses, and summary metrics.
- Server-side JSON persistence for the student, subjects, assignments, submissions, notifications, and activity.
- Protected student API routes with an HTTP-only session cookie and role checks.
- Private local upload storage with server-side deadline, attempt, extension, and size validation.
- Client-side file validation for type, size, deadline, and attempt limits, plus submission history and notifications.
- Profile editing synchronized through the backend.

## Architecture note

`server.js` uses Node's built-in HTTP, filesystem, and crypto modules. It creates `data/db.json` and `data/uploads/` on first run; both are ignored by Git so local student data and private submissions are not committed. Before production use, replace the development password with a password-hashed identity provider, move JSON persistence to a real database, add CSRF/rate-limit protection, and use managed private object storage. Client-side role checks are not a substitute for server authorization.

## Validation

```bash
node --check app.js
node --check server.js
```
