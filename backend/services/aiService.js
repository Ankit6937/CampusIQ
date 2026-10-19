// AI Insights: question -> intent detection -> real MongoDB aggregation -> real result -> explanation.
// The language model (optional) only EXPLAINS rows that came from the database; it never produces the numbers.
const analytics = require('./analyticsService');

// ---------- branch detection ("average package for CSE") ----------
const BRANCH_WORDS = [[/computer science/i, 'CSE'], [/information technology/i, 'IT'], [/electronics/i, 'ECE'], [/electrical/i, 'EEE'], [/mechanical/i, 'ME'], [/civil/i, 'CE']];
function findBranch(q) {
  const a = q.match(/\b(cse|ece|eee)\b/i);
  if (a) return a[1].toUpperCase();
  const b = q.match(/\b(IT|ME|CE)\b/); // upper-case only, so the English words "it" and "me" are not mistaken for branches
  if (b) return b[1];
  for (const [re, name] of BRANCH_WORDS) if (re.test(q)) return name;
  return null;
}

const pct = (p) => `${Math.round(p * 100)}%`;
const lpa = (v) => `₹${v} LPA`;

// ---------- intents ----------
const INTENTS = [
  { id: 'best_branch_placement', title: 'Placement rate by branch', example: 'Which branch has the highest placement rate?',
    patterns: [[/branch|department/i, 2], [/highest|best|top|lowest|worst|most/i, 1], [/placement|placed/i, 1]],
    run: async () => ({ rows: (await analytics.branchOverview()).sort((a, b) => b.placementPercentage - a.placementPercentage) }),
    describe: ({ rows }) => `${rows[0].branch} has the highest placement rate: ${rows[0].placementPercentage}% (${rows[0].placed} of ${rows[0].students} students placed).` +
      (rows[1] ? ` ${rows[1].branch} follows with ${rows[1].placementPercentage}%.` : '') + (rows.length > 2 ? ` ${rows[rows.length - 1].branch} has the lowest at ${rows[rows.length - 1].placementPercentage}%.` : '') },
  { id: 'placement_rate', title: 'Overall placement rate', example: 'What is the overall placement rate?',
    patterns: [[/placement rate|placement percentage|how many.*placed|placed students|overall placement/i, 3], [/overall|total/i, 1]],
    run: async () => ({ rows: [await analytics.summary()] }),
    describe: ({ rows: [s] }) => `${s.selectedStudents} of ${s.totalStudents} students are placed, a placement rate of ${s.placementRate}%. The average package is ${lpa(s.averagePackage)} and the highest is ${lpa(s.highestPackage)}.` },
  { id: 'avg_package', title: 'Average package', example: 'What is the average package for CSE?',
    patterns: [[/(average|avg|mean).*(package|salary|ctc|lpa)|(package|salary|ctc|lpa).*(average|avg|mean)/i, 3], [/salary|ctc|lpa/i, 1]],
    run: async (q) => {
      const branch = findBranch(q); const all = await analytics.packageByBranch();
      return { rows: branch ? all.filter((r) => r.branch === branch) : all, meta: { branch } };
    },
    describe: ({ rows, meta }) => meta.branch
      ? `Placed ${meta.branch} students get an average package of ${lpa(rows[0].avgPackage)} (highest ${lpa(rows[0].maxPackage)}), based on ${rows[0].placedStudents} placed students.`
      : `The average package is highest for ${rows[0].branch} (${lpa(rows[0].avgPackage)}) and lowest for ${rows[rows.length - 1].branch} (${lpa(rows[rows.length - 1].avgPackage)}).`,
    emptyText: ({ meta }) => (meta.branch ? `No ${meta.branch} student has been placed yet, so there is no average package.` : null) },
  { id: 'highest_package', title: 'Highest package', example: 'What is the highest package offered?',
    patterns: [[/(highest|maximum|max|top|best).*(package|salary|ctc|lpa)|(package|salary|ctc|lpa).*(highest|maximum|max)/i, 3]],
    run: async () => ({ rows: (await analytics.companyHiring(50)).sort((a, b) => b.maxPackage - a.maxPackage).slice(0, 5).map((r) => ({ company: r.company, maxPackage: r.maxPackage, hires: r.hires })) }),
    describe: ({ rows }) => `The highest package is ${lpa(rows[0].maxPackage)}, offered by ${rows[0].company}.` + (rows[1] ? ` Next is ${rows[1].company} with ${lpa(rows[1].maxPackage)}.` : '') },
  { id: 'top_skills', title: 'Most demanded skills', example: 'Which skills are most demanded?',
    patterns: [[/skill/i, 3], [/demand|popular|common|most|required/i, 1]],
    run: async () => { const s = await analytics.skills(8); return { rows: s.amongStudents, meta: { inDrives: s.inDrives } }; },
    describe: ({ rows, meta }) => `The most common skill among students is ${rows[0].skill} (${rows[0].students} students)` + (rows[2] ? `, followed by ${rows[1].skill} and ${rows[2].skill}.` : '.') +
      (meta.inDrives[0] ? ` Recruiters ask most often for ${meta.inDrives[0].skill} (required in ${meta.inDrives[0].drives} drives).` : '') },
  { id: 'high_risk', title: 'Students at high placement risk', example: 'Which students are at high placement risk?',
    patterns: [[/risk/i, 3], [/at risk|weak|struggl|unlikely|low probability|need (help|training)/i, 2]],
    run: async () => ({ rows: await analytics.highRisk(10) }),
    describe: ({ rows }) => `${rows.length} students have the lowest placement probability. The most at risk is ${rows[0].name} (${rows[0].branch}, CGPA ${rows[0].cgpa}) with ${pct(rows[0].probability)}. These students are good candidates for extra training.` },
  { id: 'top_predicted', title: 'Students most likely to be placed', example: 'Which students have the highest placement probability?',
    patterns: [[/chance|probabilit|likel/i, 3], [/highest|best|top/i, 1]],
    run: async () => ({ rows: await analytics.topPredictions(10) }),
    describe: ({ rows }) => `${rows[0].name} (${rows[0].branch}) has the highest placement probability at ${pct(rows[0].probability)}` + (rows[1] ? `, followed by ${rows[1].name} (${pct(rows[1].probability)}).` : '.') },
  { id: 'top_company', title: 'Company-wise hiring', example: 'Which company hired the most students?',
    patterns: [[/compan|recruiter|employer/i, 2], [/hired|hire|hiring|recruit|offers?/i, 2], [/most|top|highest/i, 1]],
    run: async () => ({ rows: await analytics.companyHiring(10) }),
    describe: ({ rows }) => `${rows[0].company} hired the most students: ${rows[0].hires} (average package ${lpa(rows[0].avgPackage)}).` + (rows[1] ? ` ${rows[1].company} is next with ${rows[1].hires}.` : '') },
  { id: 'avg_cgpa', title: 'Average CGPA by branch', example: 'What is the average CGPA of each branch?',
    patterns: [[/cgpa|gpa|grade/i, 3], [/average|avg|mean/i, 1]],
    run: async (q) => {
      const branch = findBranch(q); const all = (await analytics.branchOverview()).map((r) => ({ branch: r.branch, avgCgpa: r.avgCgpa, students: r.students })).sort((a, b) => b.avgCgpa - a.avgCgpa);
      return { rows: branch ? all.filter((r) => r.branch === branch) : all, meta: { branch } };
    },
    describe: ({ rows, meta }) => meta.branch ? `The average CGPA of ${meta.branch} students is ${rows[0].avgCgpa} across ${rows[0].students} students.`
      : `${rows[0].branch} has the highest average CGPA (${rows[0].avgCgpa}) and ${rows[rows.length - 1].branch} the lowest (${rows[rows.length - 1].avgCgpa}).` },
  { id: 'application_status', title: 'Applications by status', example: 'How many applications are selected or rejected?',
    patterns: [[/application|applied/i, 2], [/selected|rejected|shortlisted|interview|pending|status/i, 2]],
    run: async () => ({ rows: await analytics.applicationsByStatus() }),
    describe: ({ rows }) => `There are ${rows.reduce((s, r) => s + r.count, 0)} applications: ${rows.map((r) => `${r.count} ${r.status}`).join(', ')}.` }
];

const score = (intent, q) => intent.patterns.reduce((s, [re, w]) => s + (re.test(q) ? w : 0), 0);

/** Returns the best matching intent (score >= 3) or null. */
function detectIntent(question) {
  const q = String(question || '');
  const ranked = INTENTS.map((i) => ({ i, s: score(i, q) })).filter((x) => x.s >= 3).sort((a, b) => b.s - a.s);
  return ranked.length ? ranked[0].i : null;
}

// ---------- optional language-model explanation ----------
async function explainWithGemini(question, rows, facts) {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gemini-2.0-flash';
  const prompt = 'You are the analytics assistant of CampusIQ, a college placement system.\n' +
    'Answer the question using ONLY the data below. Never invent or estimate numbers. If the data cannot answer the question, say so. Reply in 2-4 short sentences.\n\n' +
    `Question: ${question}\n\nData from MongoDB (JSON):\n${JSON.stringify(rows.slice(0, 15))}\n\nSummary computed by the system: ${facts}`;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 300 } }), signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`AI provider returned ${res.status}`);
  const json = await res.json();
  const text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
  if (!text) throw new Error('Empty AI answer');
  return text;
}

exports.suggestions = () => ({ aiConfigured: Boolean(process.env.AI_API_KEY), questions: INTENTS.map((i) => i.example) });
exports.detectIntent = detectIntent;
exports.findBranch = findBranch;
exports.INTENTS = INTENTS;

exports.ask = async (question) => {
  const intent = detectIntent(question);
  if (!intent) {
    return { question, intent: null, rows: [], explainedBy: 'none', answer: 'I can answer questions about placement rates, packages, skills, companies, students at risk, CGPA and application status. Try one of the suggested questions.' };
  }
  const out = await intent.run(question);
  const base = { question, intent: { id: intent.id, title: intent.title }, rows: out.rows, source: 'MongoDB aggregation pipeline' };
  if (!out.rows.length) {
    const special = intent.emptyText && intent.emptyText(out);
    return { ...base, explainedBy: 'template', answer: special || 'The database has no data for this question yet. Run "npm run seed" in the backend folder to load demo data.' };
  }
  const facts = intent.describe(out);
  if (!process.env.AI_API_KEY) return { ...base, explainedBy: 'template', answer: facts };
  try {
    return { ...base, explainedBy: 'gemini', answer: await explainWithGemini(question, out.rows, facts) };
  } catch (e) {
    return { ...base, explainedBy: 'template', answer: facts, notice: 'The AI provider could not be reached, so the built-in answer is shown.' };
  }
};
