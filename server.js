const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const dataDir = path.join(root, 'data');
const uploadDir = path.join(dataDir, 'uploads');
const dbFile = path.join(dataDir, 'db.json');
const port = Number(process.env.PORT || 4173);
const sessionToken = 'assigntrack-student-session';
const allowedTypes = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip', 'ipynb', 'csv', 'png', 'jpg', 'jpeg']);

const seed = {
  user: { id: 'student-001', role: 'student', name: 'Aarav Mehta', studentId: 'IT2024-018', email: 'aarav.mehta@example.edu', course: 'BSc Information Technology', department: 'Computer Science', year: 'Final Year', semester: 'Semester 6', division: 'B' },
  subjects: [
    { id: 'web', name: 'Web Development', code: 'IT603', faculty: 'Prof. Maya Shah' },
    { id: 'db', name: 'Database Management', code: 'IT604', faculty: 'Dr. Neel Joshi' },
    { id: 'python', name: 'Python Programming', code: 'IT605', faculty: 'Prof. Riya Nair' },
    { id: 'cloud', name: 'Cloud Computing', code: 'IT606', faculty: 'Prof. Omar Khan' }
  ],
  assignments: [
    { id: 'a1', title: 'Web Development Assignment 01', subjectId: 'web', faculty: 'Prof. Maya Shah', assigned: '2026-08-22', due: '2026-09-10', description: 'Build a responsive student portal using semantic HTML, CSS and JavaScript.', instructions: 'Submit a zipped project folder with a short README explaining your design decisions.', maxMarks: 20, fileTypes: 'ZIP, PDF', maxSize: 10, attempts: 2, status: 'pending', submissions: [], resources: ['assignment-brief.pdf'] },
    { id: 'a2', title: 'Database Schema Design', subjectId: 'db', faculty: 'Dr. Neel Joshi', assigned: '2026-08-15', due: '2026-09-06', description: 'Design a normalized schema for an online learning platform.', instructions: 'Include an ER diagram and SQL DDL statements.', maxMarks: 25, fileTypes: 'PDF, DOCX', maxSize: 8, attempts: 1, status: 'graded', submissions: [{ date: '2026-08-29T11:20:00Z', fileName: 'aarav-db-schema.pdf', attempt: 1, marks: 22, feedback: 'Strong normalization choices. Add clearer relationship cardinalities.', gradedDate: '2026-09-02' }], resources: ['schema-reference.pdf'] },
    { id: 'a3', title: 'Python Data Analysis', subjectId: 'python', faculty: 'Prof. Riya Nair', assigned: '2026-08-30', due: '2026-09-15', description: 'Analyze the supplied dataset and communicate three useful insights.', instructions: 'Submit your notebook and a PDF summary of your findings.', maxMarks: 30, fileTypes: 'IPYNB, PDF', maxSize: 15, attempts: 2, status: 'submitted', submissions: [{ date: '2026-09-01T16:10:00Z', fileName: 'aarav-analysis.ipynb', attempt: 1, marks: null, feedback: '', gradedDate: null }], resources: ['sales-data.csv'] },
    { id: 'a4', title: 'Cloud Architecture Notes', subjectId: 'cloud', faculty: 'Prof. Omar Khan', assigned: '2026-09-01', due: '2026-09-20', description: 'Compare two deployment patterns for a small e-commerce service.', instructions: 'Use diagrams and cite at least three technical sources.', maxMarks: 20, fileTypes: 'PDF, DOCX', maxSize: 5, attempts: 1, status: 'pending', submissions: [], resources: [] },
    { id: 'a5', title: 'Web Accessibility Audit', subjectId: 'web', faculty: 'Prof. Maya Shah', assigned: '2026-08-05', due: '2026-08-28', description: 'Audit an existing website against WCAG principles.', instructions: 'Document findings with screenshots and remediation advice.', maxMarks: 15, fileTypes: 'PDF', maxSize: 5, attempts: 1, status: 'overdue', submissions: [], resources: [] }
  ],
  notifications: [
    { id: 'n1', type: 'New assignment', message: 'Cloud Architecture Notes was added to your assignments.', date: '2026-09-01T09:00:00Z', read: false },
    { id: 'n2', type: 'Assignment graded', message: 'Database Schema Design has been graded. View your feedback.', date: '2026-09-02T13:15:00Z', read: false },
    { id: 'n3', type: 'Deadline approaching', message: 'Database Schema Design is due in 3 days.', date: '2026-09-03T08:30:00Z', read: true }
  ],
  activity: [
    { icon: '✓', text: 'Database Schema Design was graded', date: '2026-09-02T13:15:00Z' },
    { icon: '↑', text: 'Submitted Python Data Analysis', date: '2026-09-01T16:10:00Z' },
    { icon: '+', text: 'New Cloud Architecture Notes received', date: '2026-09-01T09:00:00Z' }
  ]
};

fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(seed, null, 2));
function readDb() { return JSON.parse(fs.readFileSync(dbFile, 'utf8')); }
function writeDb(db) { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }
function send(response, status, body, headers = {}) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers }); response.end(JSON.stringify(body)); }
function parseCookies(request) { return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map(value => { const [key, ...parts] = value.trim().split('='); return [key, decodeURIComponent(parts.join('='))]; })); }
function currentUser(request, db) { return parseCookies(request)[sessionToken] === 'student-001' ? db.user : null; }
function statusOf(assignment) { const latest = assignment.submissions.at(-1); if (latest?.marks !== null && latest?.marks !== undefined) return 'graded'; if (latest) return 'submitted'; if (new Date(`${assignment.due}T23:59:59`) < new Date()) return 'overdue'; return assignment.status; }
function dashboard(db) { const assignments = db.assignments.map(assignment => ({ ...assignment, subject: db.subjects.find(subject => subject.id === assignment.subjectId)?.name, status: statusOf(assignment), submission: assignment.submissions.at(-1) || null })); const graded = assignments.filter(a => a.status === 'graded'); const average = graded.length ? Math.round(graded.reduce((total, a) => total + a.submission.marks / a.maxMarks * 100, 0) / graded.length) : 0; return { user: db.user, subjects: db.subjects.map(subject => ({ ...subject, assignments: assignments.filter(a => a.subjectId === subject.id).length })), assignments, notifications: db.notifications, activity: db.activity, stats: { total: assignments.length, pending: assignments.filter(a => ['pending', 'resubmission'].includes(a.status)).length, submitted: assignments.filter(a => a.status === 'submitted').length, dueSoon: assignments.filter(a => { const days = (new Date(`${a.due}T23:59:59`) - new Date()) / 86400000; return days >= 0 && days <= 7 && a.status !== 'graded'; }).length, graded: graded.length, average } }; }
function body(request) { return new Promise((resolve, reject) => { let raw = ''; request.on('data', chunk => raw += chunk); request.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); }); }
function serveStatic(request, response) { const requested = request.url === '/' ? 'index.html' : request.url.slice(1); const file = path.resolve(root, requested); if (!file.startsWith(root) || file.includes('..')) return send(response, 403, { error: 'Forbidden' }); fs.readFile(file, (error, content) => { if (error) return send(response, 404, { error: 'Not found' }); const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }; response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); response.end(content); }); }

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (!url.pathname.startsWith('/api/')) return serveStatic(request, response);
  const db = readDb();
  if (url.pathname === '/api/auth/login' && request.method === 'POST') { const credentials = await body(request).catch(() => ({})); if (credentials.email !== db.user.email || credentials.password !== 'student123') return send(response, 401, { error: 'Invalid credentials.' }); return send(response, 200, { user: db.user }, { 'Set-Cookie': `${sessionToken}=student-001; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400` }); }
  const user = currentUser(request, db); if (!user || user.role !== 'student') return send(response, 401, { error: 'Authentication required.' });
  if (url.pathname === '/api/student/dashboard' && request.method === 'GET') return send(response, 200, dashboard(db));
  if (url.pathname === '/api/student/profile' && request.method === 'PATCH') { const changes = await body(request); db.user.name = String(changes.name || db.user.name).trim(); db.user.email = String(changes.email || db.user.email).trim(); writeDb(db); return send(response, 200, { user: db.user }); }
  if (url.pathname === '/api/student/notifications/read-all' && request.method === 'PATCH') { db.notifications.forEach(note => note.read = true); writeDb(db); return send(response, 200, { notifications: db.notifications }); }
  const readMatch = url.pathname.match(/^\/api\/student\/notifications\/([^/]+)\/read$/); if (readMatch && request.method === 'PATCH') { const note = db.notifications.find(item => item.id === readMatch[1]); if (!note) return send(response, 404, { error: 'Notification not found.' }); note.read = true; writeDb(db); return send(response, 200, { notification: note }); }
  const assignmentMatch = url.pathname.match(/^\/api\/student\/assignments\/([^/]+)\/submissions$/); if (assignmentMatch && request.method === 'POST') { const assignment = db.assignments.find(item => item.id === assignmentMatch[1]); if (!assignment) return send(response, 404, { error: 'Assignment not found.' }); if (new Date(`${assignment.due}T23:59:59`) < new Date()) return send(response, 400, { error: 'The submission deadline has passed.' }); if (assignment.submissions.length >= assignment.attempts) return send(response, 400, { error: 'You have used all available attempts.' }); const submission = await body(request); const extension = String(submission.fileName || '').split('.').pop().toLowerCase(); if (!allowedTypes.has(extension)) return send(response, 400, { error: 'Unsupported file type.' }); if (!submission.data || Number(submission.size) > assignment.maxSize * 1024 * 1024) return send(response, 400, { error: 'Invalid or oversized file.' }); const safeName = `${Date.now()}-${crypto.randomUUID()}-${path.basename(submission.fileName)}`; fs.writeFileSync(path.join(uploadDir, safeName), Buffer.from(submission.data, 'base64')); const saved = { date: new Date().toISOString(), fileName: submission.fileName, storedName: safeName, size: Number(submission.size), attempt: assignment.submissions.length + 1, marks: null, feedback: '', gradedDate: null, note: String(submission.note || '') }; assignment.submissions.push(saved); assignment.status = 'submitted'; db.activity.unshift({ icon: '↑', text: `Submitted ${assignment.title}`, date: saved.date }); db.notifications.unshift({ id: `n-${Date.now()}`, type: 'Successful submission', message: `${assignment.title} was submitted successfully.`, date: saved.date, read: false }); writeDb(db); return send(response, 201, { assignment: { ...assignment, subject: db.subjects.find(s => s.id === assignment.subjectId)?.name, status: statusOf(assignment), submission: saved } }); }
  return send(response, 404, { error: 'API route not found.' });
});
server.listen(port, () => console.log(`AssignTrack running at http://localhost:${port}`));
