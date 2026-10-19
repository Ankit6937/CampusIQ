// Pure data generator (no database access). Deterministic for a given seed, so results are repeatable.
const { Types } = require('mongoose');
const D = require('./data');

function makeRng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

module.exports = function generate({ now = new Date(), seed = 42, studentCount = 120, applicationCount = 300, strict = true } = {}) {
  const r = makeRng(seed);
  const DAY = 86400000;
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const int = (a, b) => a + Math.floor(r() * (b - a + 1));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const gauss = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const wpick = (items, weights) => { let t = r() * weights.reduce((s, w) => s + w, 0); for (let i = 0; i < items.length; i++) { t -= weights[i]; if (t <= 0) return items[i]; } return items[items.length - 1]; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sampleWeighted = (pool, n) => Object.entries(pool).map(([k, w]) => [k, Math.pow(r(), 1 / w)]).sort((x, y) => y[1] - x[1]).slice(0, n).map((x) => x[0]);
  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;

  // ---- skills & companies ----
  const skills = D.SKILLS.map(([name, category, demandScore]) => ({
    _id: new Types.ObjectId(), name, category, demandScore,
    description: `${name} - ${category} skill frequently requested by recruiters`, createdAt: addDays(now, -600)
  }));
  const companies = D.COMPANIES.map(([name, industry, location, companySize]) => ({
    _id: new Types.ObjectId(), name, industry, location, companySize,
    website: `https://www.${name.toLowerCase().replace(/[^a-z]/g, '')}.example.com`,
    description: `${name} is a fictional ${industry.toLowerCase()} company based in ${location}.`, createdAt: addDays(now, -800)
  }));

  // ---- students ----
  const BR = ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE'];
  const students = [];
  for (let i = 0; i < studentCount; i++) {
    const branch = wpick(BR, [30, 20, 20, 10, 10, 10]);
    const gy = wpick([2025, 2026, 2027], [0.27, 0.43, 0.30]);
    const cs = branch === 'CSE' || branch === 'IT';
    const a = gauss(); // latent "ability": drives every score so that outcomes are realistic and ML has signal
    const female = r() < 0.4;
    const first = pick(female ? D.FEMALE : D.MALE), last = pick(D.SURNAMES);
    const poolKey = cs ? 'CS' : (branch === 'ECE' || branch === 'EEE') ? 'EL' : 'CORE';
    const nSkills = clamp(Math.round(4 + 1.5 * a + (cs ? 1.5 : -0.5) + gauss()), 2, 9);
    const sk = sampleWeighted(D.POOLS[poolKey], nSkills).map((name) => {
      const p = r() + 0.15 * a;
      return { name, level: p > 0.75 ? 'Advanced' : p > 0.4 ? 'Intermediate' : 'Beginner' };
    });
    const nProj = clamp(Math.round(2 + 0.9 * a + gauss() * 0.8), 0, 5);
    const projPool = shuffle([...(cs ? D.PROJECTS_CS : D.PROJECTS_CORE)]);
    const nCert = clamp(Math.round(2 + 0.8 * a + gauss()), 0, 5);
    const certPool = shuffle([...D.CERTS]);
    const nIntern = a + gauss() * 0.7 > 0.6 ? (a > 1.3 ? 2 : 1) : 0;
    students.push({
      _id: new Types.ObjectId(),
      name: `${first} ${last}`,
      email: `${first}.${last}${i + 1}@campusiq.edu.in`.toLowerCase(),
      phone: `${pick([6, 7, 8, 9])}${int(100000000, 999999999)}`,
      rollNumber: `${String(gy - 4).slice(-2)}${branch}${String(i + 1).padStart(3, '0')}`,
      branch, graduationYear: gy,
      cgpa: r2(clamp(7.3 + 0.85 * a + gauss() * 0.35, 5.2, 9.9)),
      attendance: clamp(Math.round(80 + 6 * a + gauss() * 6), 58, 99),
      gender: female ? 'Female' : 'Male', location: pick(D.CITIES),
      skills: sk,
      projects: projPool.slice(0, nProj).map((title) => ({ title, description: `${title} built as a ${cs ? 'software' : 'core engineering'} project`, techStack: sk.slice(0, 3).map((s) => s.name) })),
      certifications: certPool.slice(0, nCert).map(([name, issuer]) => ({ name, issuer, issuedOn: addDays(now, -int(30, 700)) })),
      internships: Array.from({ length: nIntern }, () => ({ company: pick(D.INTERN_COMPANIES), role: cs ? 'Software Intern' : 'Engineering Intern', durationMonths: int(1, 6) })),
      dsaScore: clamp(Math.round(56 + 14 * a + (cs ? 8 : -6) + gauss() * 7), 10, 98),
      aptitudeScore: clamp(Math.round(62 + 13 * a + gauss() * 8), 15, 99),
      communicationScore: clamp(Math.round(64 + 11 * a + gauss() * 9), 20, 99),
      resumeScore: clamp(Math.round(58 + 12 * a + gauss() * 9), 15, 98),
      createdAt: addDays(now, -int(60, 500)), updatedAt: now
    });
  }

  // ---- drives ----
  const drives = D.DRIVES.map((t) => ({
    _id: new Types.ObjectId(), companyId: companies[t.c]._id, jobTitle: t.title,
    description: `${t.title} role at ${companies[t.c].name}. Selection: aptitude, technical and interview rounds.`,
    package: t.pkg, jobType: t.type || 'Full-time', location: t.loc,
    minimumCGPA: t.cgpa, minimumAttendance: t.att, requiredSkills: t.skills, eligibilityBranches: t.br,
    driveDate: addDays(now, t.off), applicationDeadline: addDays(now, t.off - 5),
    status: t.cancelled ? 'Cancelled' : t.off <= -7 ? 'Completed' : t.off <= 30 ? 'Active' : 'Upcoming',
    createdAt: addDays(now, t.off - 30)
  }));

  const isElig = (s, d) => d.eligibilityBranches.includes(s.branch) && s.cgpa >= d.minimumCGPA && s.attendance >= d.minimumAttendance;
  const primaryGradYear = (date) => (date.getUTCMonth() >= 6 ? date.getUTCFullYear() + 1 : date.getUTCFullYear());

  // ---- application targets per drive (weighted by size of eligible batch) ----
  const live = D.DRIVES.map((t, i) => i).filter((i) => !D.DRIVES[i].cancelled).sort((x, y) => D.DRIVES[x].off - D.DRIVES[y].off);
  const weights = live.map((i) => { const pg = primaryGradYear(drives[i].driveDate); return Math.max(8, students.filter((s) => s.graduationYear === pg && isElig(s, drives[i])).length); });
  const wsum = weights.reduce((s, w) => s + w, 0);
  const targets = weights.map((w) => clamp(Math.round(applicationCount * w / wsum), 8, 28));
  let diff = applicationCount - targets.reduce((s, t) => s + t, 0), k = 0;
  while (diff !== 0 && k < 1000) { const j = k++ % targets.length; if (diff > 0 && targets[j] < 28) { targets[j]++; diff--; } else if (diff < 0 && targets[j] > 8) { targets[j]--; diff++; } }

  // ---- applications, processed chronologically so a placed student does not apply again ----
  const placed = new Set();
  const applications = [];
  live.forEach((di, idx) => {
    const d = drives[di], meta = D.DRIVES[di], pg = primaryGradYear(d.driveDate);
    const elig = [], other = [];
    students.forEach((s) => {
      if (placed.has(String(s._id))) return;
      if (s.graduationYear === pg || (s.graduationYear === pg - 1 && r() < 0.25)) (isElig(s, d) ? elig : other).push(s);
    });
    shuffle(elig); shuffle(other);
    const chosen = [];
    while (chosen.length < targets[idx] && (elig.length || other.length)) {
      chosen.push(((elig.length && (r() < 0.88 || !other.length)) ? elig : other).pop());
    }
    const completed = d.status === 'Completed';
    const rows = chosen.map((s) => {
      const have = new Set(s.skills.map((x) => x.name));
      const match = d.requiredSkills.length ? d.requiredSkills.filter((x) => have.has(x)).length / d.requiredSkills.length : 1;
      const apt = clamp(Math.round(s.aptitudeScore + gauss() * 8), 0, 100);
      const tech = clamp(Math.round(0.5 * s.dsaScore + 0.3 * match * 100 + 0.2 * s.resumeScore + gauss() * 7), 0, 100);
      const itv = clamp(Math.round(0.6 * s.communicationScore + 0.4 * s.dsaScore + gauss() * 9), 0, 100);
      let appliedAt = addDays(d.applicationDeadline, -int(0, 21));
      if (appliedAt > now) appliedAt = addDays(now, -int(0, 9));
      appliedAt = new Date(appliedAt.getTime() + int(0, 86399) * 1000);
      if (appliedAt > now) appliedAt = new Date(now.getTime() - 3600000);
      return {
        s, eligible: isElig(s, d), apt, tech, itv, fin: Math.round(0.3 * apt + 0.4 * tech + 0.3 * itv),
        doc: { _id: new Types.ObjectId(), studentId: s._id, driveId: d._id, status: 'Applied', appliedAt, createdAt: appliedAt, updatedAt: appliedAt }
      };
    });
    const aptCut = 50 + meta.diff * 1.5, techCut = 45 + meta.diff * 2, finCut = 55 + meta.diff * 1.5;
    const passers = [];
    rows.forEach((x) => {
      const doc = x.doc;
      if (completed) {
        doc.updatedAt = new Date(Math.min(now.getTime(), addDays(d.driveDate, int(1, 10)).getTime()));
        if (!x.eligible) { doc.status = 'Rejected'; doc.remarks = 'Not eligible as per drive criteria'; }
        else if (x.apt < aptCut) { doc.status = 'Rejected'; doc.aptitudeScore = x.apt; doc.remarks = 'Did not clear aptitude round'; }
        else if (x.tech < techCut) { doc.status = 'Rejected'; Object.assign(doc, { aptitudeScore: x.apt, technicalScore: x.tech, remarks: 'Did not clear technical round' }); }
        else {
          Object.assign(doc, { aptitudeScore: x.apt, technicalScore: x.tech, interviewScore: x.itv, finalScore: x.fin });
          if (x.fin < finCut) { doc.status = 'Rejected'; doc.remarks = 'Not selected after interview'; } else passers.push(x);
        }
      } else if (meta.off <= 12) {
        const p = r();
        if (p < 0.5) doc.status = 'Applied';
        else if (p < 0.85) { doc.status = 'Shortlisted'; doc.aptitudeScore = x.apt; }
        else { doc.status = 'Interview'; doc.aptitudeScore = x.apt; doc.technicalScore = x.tech; }
      }
    });
    if (completed) {
      passers.sort((p, q) => q.fin - p.fin).forEach((x, n) => {
        if (n < meta.open) { x.doc.status = 'Selected'; x.doc.remarks = 'Offer rolled out'; placed.add(String(x.s._id)); }
        else { x.doc.status = 'Rejected'; x.doc.remarks = 'Waitlisted - openings filled'; }
      });
    }
    rows.forEach((x) => applications.push(x.doc));
  });
  if (strict && applications.length !== applicationCount) throw new Error(`Seed generated ${applications.length} applications, expected ${applicationCount}`);

  // ---- predictions (baseline logistic score; replaced by the Python ML model in Phase 5) ----
  const predictions = students.map((s) => {
    const c = [
      ['CGPA', 0.9 * (s.cgpa - 7.3)], ['DSA score', 0.025 * (s.dsaScore - 56)], ['Aptitude score', 0.02 * (s.aptitudeScore - 62)],
      ['Communication score', 0.015 * (s.communicationScore - 64)], ['Projects', 0.15 * (s.projects.length - 2)],
      ['Certifications', 0.12 * (s.certifications.length - 2)], ['Internships', 0.5 * (s.internships.length - 0.4)],
      ['Skills', 0.1 * (s.skills.length - 5)], ['Attendance', 0.03 * (s.attendance - 80)]
    ];
    const z = 0.2 + c.reduce((sum, x) => sum + x[1], 0);
    const p = 1 / (1 + Math.exp(-z));
    return {
      _id: new Types.ObjectId(), studentId: s._id, placementProbability: r2(p),
      predictedPackage: r1(Math.max(3, 3.2 + p * 9 + gauss() * 0.8)),
      riskLevel: p >= 0.65 ? 'Low' : p >= 0.35 ? 'Medium' : 'High',
      importantFactors: c.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 3).map(([feature, impact]) => ({ feature, impact: r2(impact) })),
      modelVersion: 'seed-baseline-v0', createdAt: now
    };
  });

  return { skills, companies, students, drives, applications, predictions, placedStudents: placed.size };
};
