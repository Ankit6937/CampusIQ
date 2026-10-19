// Real MongoDB aggregation pipelines (Unit IV). Nothing here is hardcoded - every number comes from the database.
const { Student, Company, JobDrive, Application, Skill, Prediction } = require('../models');

// Actual collection names (so $lookup never depends on guessing Mongoose pluralisation)
const C = {
  students: Student.collection.name, companies: Company.collection.name, drives: JobDrive.collection.name,
  applications: Application.collection.name, skills: Skill.collection.name
};

// percentage helper: round(num / max(den,1) * 100, 1)
const pct = (num, den) => ({ $round: [{ $multiply: [{ $divide: [num, { $max: [den, 1] }] }, 100] }, 1] });

// $lookup (with let + pipeline) -> adds a boolean "placed" to every student
const placedFlag = [
  { $lookup: { from: C.applications, let: { sid: '$_id' }, pipeline: [
    { $match: { status: 'Selected', $expr: { $eq: ['$studentId', '$$sid'] } } }, { $limit: 1 }, { $project: { _id: 1 } }
  ], as: 'selected' } },
  { $addFields: { placed: { $gt: [{ $size: '$selected' }, 0] } } }
];

// Selected applications joined with their drive ($match + $lookup + $unwind)
const selectedWithDrive = [
  { $match: { status: 'Selected' } },
  { $lookup: { from: C.drives, localField: 'driveId', foreignField: '_id', as: 'drive' } },
  { $unwind: '$drive' }
];
// One row per placed student with the best package they received ($group)
const packagePerPlacedStudent = [...selectedWithDrive, { $group: { _id: '$studentId', package: { $max: '$drive.package' } } }];

const lim = (n, d = 10) => Math.min(50, Math.max(1, parseInt(n) || d));

exports.summary = async () => {
  const [totalStudents, totalCompanies, activeDrives, totalApplications, pkg] = await Promise.all([
    Student.aggregate([{ $count: 'n' }]),
    Company.aggregate([{ $count: 'n' }]),
    JobDrive.aggregate([{ $match: { status: 'Active' } }, { $count: 'n' }]),
    Application.aggregate([{ $count: 'n' }]),
    Application.aggregate([...packagePerPlacedStudent, { $group: { _id: null, placed: { $sum: 1 }, avgPackage: { $avg: '$package' }, highestPackage: { $max: '$package' } } }])
  ]);
  const n = (a) => (a[0] ? a[0].n : 0);
  const p = pkg[0] || { placed: 0, avgPackage: 0, highestPackage: 0 };
  const total = n(totalStudents);
  return {
    totalStudents: total, totalCompanies: n(totalCompanies), activeDrives: n(activeDrives), totalApplications: n(totalApplications),
    selectedStudents: p.placed, placementRate: total ? Math.round((p.placed / total) * 1000) / 10 : 0,
    averagePackage: Math.round(p.avgPackage * 100) / 100, highestPackage: p.highestPackage
  };
};

exports.studentsByBranch = () => Student.aggregate([
  { $group: { _id: '$branch', students: { $sum: 1 } } }, { $project: { _id: 0, branch: '$_id', students: 1 } }, { $sort: { students: -1 } }
]);

exports.avgCgpaByBranch = () => Student.aggregate([
  { $group: { _id: '$branch', avgCgpa: { $avg: '$cgpa' } } }, { $project: { _id: 0, branch: '$_id', avgCgpa: { $round: ['$avgCgpa', 2] } } }, { $sort: { avgCgpa: -1 } }
]);

// students, average CGPA and placement % per branch in a single pipeline
exports.branchOverview = () => Student.aggregate([
  ...placedFlag,
  { $group: { _id: '$branch', students: { $sum: 1 }, avgCgpa: { $avg: '$cgpa' }, placed: { $sum: { $cond: ['$placed', 1, 0] } } } },
  { $project: { _id: 0, branch: '$_id', students: 1, avgCgpa: { $round: ['$avgCgpa', 2] }, placed: 1, placementPercentage: pct('$placed', '$students') } },
  { $sort: { branch: 1 } }
]);

exports.packageByBranch = () => Application.aggregate([
  ...packagePerPlacedStudent,
  { $lookup: { from: C.students, localField: '_id', foreignField: '_id', as: 'student' } }, { $unwind: '$student' },
  { $group: { _id: '$student.branch', placedStudents: { $sum: 1 }, avgPackage: { $avg: '$package' }, maxPackage: { $max: '$package' } } },
  { $project: { _id: 0, branch: '$_id', placedStudents: 1, avgPackage: { $round: ['$avgPackage', 2] }, maxPackage: 1 } },
  { $sort: { avgPackage: -1 } }
]);

exports.placementByYear = () => Student.aggregate([
  ...placedFlag,
  { $group: { _id: '$graduationYear', students: { $sum: 1 }, placed: { $sum: { $cond: ['$placed', 1, 0] } } } },
  { $project: { _id: 0, year: '$_id', students: 1, placed: 1, placementPercentage: pct('$placed', '$students') } },
  { $sort: { year: 1 } }
]);

exports.companyHiring = (limit) => Application.aggregate([
  ...selectedWithDrive,
  { $lookup: { from: C.companies, localField: 'drive.companyId', foreignField: '_id', as: 'company' } }, { $unwind: '$company' },
  { $group: { _id: '$company._id', company: { $first: '$company.name' }, industry: { $first: '$company.industry' }, hires: { $sum: 1 }, avgPackage: { $avg: '$drive.package' }, maxPackage: { $max: '$drive.package' } } },
  { $project: { _id: 0, company: 1, industry: 1, hires: 1, avgPackage: { $round: ['$avgPackage', 2] }, maxPackage: 1 } },
  { $sort: { hires: -1, company: 1 } }, { $limit: lim(limit, 15) }
]);

exports.skills = async (limit) => {
  const [amongStudents, inDrives] = await Promise.all([
    Student.aggregate([
      { $unwind: '$skills' }, { $group: { _id: '$skills.name', students: { $sum: 1 } } },
      { $lookup: { from: C.skills, localField: '_id', foreignField: 'name', as: 'meta' } }, { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, skill: '$_id', students: 1, category: { $ifNull: ['$meta.category', 'Other'] }, demandScore: { $ifNull: ['$meta.demandScore', null] } } },
      { $sort: { students: -1, skill: 1 } }, { $limit: lim(limit) }
    ]),
    JobDrive.aggregate([
      { $unwind: '$requiredSkills' }, { $group: { _id: '$requiredSkills', drives: { $sum: 1 } } },
      { $project: { _id: 0, skill: '$_id', drives: 1 } }, { $sort: { drives: -1, skill: 1 } }, { $limit: lim(limit) }
    ])
  ]);
  return { amongStudents, inDrives };
};

exports.applicationsByStatus = async () => {
  const rows = await Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const m = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return Application.STATUSES.map((status) => ({ status, count: m[status] || 0 })); // fixed order, zero-filled for charts
};

exports.monthlyApplications = () => Application.aggregate([
  { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$appliedAt' } }, count: { $sum: 1 } } },
  { $project: { _id: 0, month: '$_id', count: 1 } }, { $sort: { month: 1 } }
]);

// Hiring funnel: how many applications reached each round ($facet runs several counts in one pass)
exports.funnel = async () => {
  const has = (f) => ({ [f]: { $exists: true, $ne: null } });
  const [r] = await Application.aggregate([{ $facet: {
    applied: [{ $count: 'n' }],
    aptitude: [{ $match: has('aptitudeScore') }, { $count: 'n' }],
    technical: [{ $match: has('technicalScore') }, { $count: 'n' }],
    interview: [{ $match: has('interviewScore') }, { $count: 'n' }],
    selected: [{ $match: { status: 'Selected' } }, { $count: 'n' }]
  } }]);
  const n = (k) => (r[k][0] ? r[k][0].n : 0);
  return [['Applied', 'applied'], ['Aptitude Round', 'aptitude'], ['Technical Round', 'technical'], ['Interview Round', 'interview'], ['Selected', 'selected']].map(([stage, k]) => ({ stage, count: n(k) }));
};

const predictionRows = (match, sortDir, limit) => Prediction.aggregate([
  ...(match ? [{ $match: match }] : []),
  { $sort: { placementProbability: sortDir } }, { $limit: lim(limit) },
  { $lookup: { from: C.students, localField: 'studentId', foreignField: '_id', as: 'student' } }, { $unwind: '$student' },
  { $project: { _id: 0, studentId: '$student._id', name: '$student.name', branch: '$student.branch', cgpa: '$student.cgpa', probability: '$placementProbability', riskLevel: 1, predictedPackage: 1 } }
]);
exports.topPredictions = (limit) => predictionRows(null, -1, limit);
exports.highRisk = (limit) => predictionRows({ riskLevel: 'High' }, 1, limit);
exports.riskDistribution = () => Prediction.aggregate([
  { $group: { _id: '$riskLevel', count: { $sum: 1 } } }, { $project: { _id: 0, riskLevel: '$_id', count: 1 } }, { $sort: { riskLevel: 1 } }
]);

exports.dashboard = async () => {
  const [summary, branches, packagesByBranch, status, skills, companies, monthly, funnel] = await Promise.all([
    exports.summary(), exports.branchOverview(), exports.packageByBranch(), exports.applicationsByStatus(),
    exports.skills(8), exports.companyHiring(8), exports.monthlyApplications(), exports.funnel()
  ]);
  return { summary, branches, packagesByBranch, status, skills, companies, monthly, funnel };
};
