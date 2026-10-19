// Builds ml/dataset.csv for the ML model from the same generator that creates the seed data.
// Several random seeds give ~1000 labelled students. Run: npm run export-dataset
const fs = require('fs');
const path = require('path');
const generate = require('./generate');

const rows = [['cgpa', 'attendance', 'dsa_score', 'aptitude_score', 'communication_score', 'num_projects', 'num_certifications', 'num_internships', 'num_skills', 'placed', 'package']];
const now = new Date('2026-10-15T00:00:00Z');
for (let seed = 1; seed <= 9; seed++) {
  const g = generate({ now, seed, strict: false }); // a few seeds produce 297-300 applications, which is fine here
  const drive = Object.fromEntries(g.drives.map((d) => [String(d._id), d.package]));
  const best = {};
  g.applications.filter((a) => a.status === 'Selected').forEach((a) => {
    const id = String(a.studentId); best[id] = Math.max(best[id] || 0, drive[String(a.driveId)]);
  });
  g.students.forEach((s) => {
    const pkg = best[String(s._id)];
    rows.push([s.cgpa, s.attendance, s.dsaScore, s.aptitudeScore, s.communicationScore, s.projects.length, s.certifications.length, s.internships.length, s.skills.length, pkg ? 1 : 0, pkg || '']);
  });
}
const out = path.join(__dirname, '..', '..', 'ml', 'dataset.csv');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, rows.map((r) => r.join(',')).join('\n') + '\n');
console.log(`Wrote ${rows.length - 1} rows to ${out}`);
