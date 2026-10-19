// Rule-based index advisor ("AI-driven query optimization", Unit V).
// It applies MongoDB's ESR rule: Equality fields first, then Sort fields, then Range fields.
const RANGE_OPS = ['$gt', '$gte', '$lt', '$lte', '$ne', '$nin'];

exports.analyze = function analyze(filter = {}, sort = {}) {
  const equality = [], range = [];
  for (const [field, cond] of Object.entries(filter)) {
    const isRange = cond && typeof cond === 'object' && !Array.isArray(cond) && Object.keys(cond).some((k) => RANGE_OPS.includes(k));
    (isRange ? range : equality).push(field);
  }
  const sortFields = Object.keys(sort).filter((f) => !equality.includes(f));
  const keys = {};
  equality.forEach((f) => { keys[f] = 1; });
  sortFields.forEach((f) => { keys[f] = sort[f]; });
  range.forEach((f) => { if (!(f in keys)) keys[f] = 1; });

  const reasons = [];
  if (equality.length) reasons.push(`Equality fields (${equality.join(', ')}) go first because they narrow the search the most.`);
  if (sortFields.length) reasons.push(`Sort fields (${sortFields.join(', ')}) come next so MongoDB can read documents already sorted and skip the in-memory SORT stage.`);
  if (range.length) reasons.push(`Range fields (${range.join(', ')}) go last because a range scan stops the index from ordering anything after it.`);
  if (!Object.keys(keys).length) reasons.push('The query has no filter or sort, so no index is needed.');
  return { rule: 'ESR (Equality, Sort, Range)', keys, reasons, createIndex: `db.students.createIndex(${JSON.stringify(keys)})` };
};
