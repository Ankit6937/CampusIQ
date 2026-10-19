const mongoose = require('mongoose');
const asyncHandler = require('./asyncHandler');

function notFoundError(name) {
  const e = new Error(`${name} not found`); e.status = 404; return e;
}

// MongoDB has no foreign keys, so referenced documents are verified in application code.
function refError(msg) { const e = new Error(msg); e.status = 400; return e; }

function checkId(id, name) {
  if (!mongoose.isValidObjectId(id)) { const e = new Error(`Invalid ${name} id`); e.status = 400; throw e; }
}

/**
 * Generic CRUD controller used by companies, drives and applications.
 * Students use a custom controller because of search/filter/pagination.
 */
module.exports = Object.assign(function crudFactory(Model, name, { populate = '', listFilter = () => ({}), beforeSave = async () => {} } = {}) {
  return {
    list: asyncHandler(async (req, res) => {
      const filter = listFilter(req.query);
      const data = await Model.find(filter).populate(populate).sort({ createdAt: -1 });
      res.json({ success: true, count: data.length, data });
    }),
    get: asyncHandler(async (req, res) => {
      checkId(req.params.id, name);
      const doc = await Model.findById(req.params.id).populate(populate);
      if (!doc) throw notFoundError(name);
      res.json({ success: true, data: doc });
    }),
    create: asyncHandler(async (req, res) => {
      await beforeSave(req.body);
      const doc = await Model.create(req.body);
      res.status(201).json({ success: true, data: doc });
    }),
    update: asyncHandler(async (req, res) => {
      checkId(req.params.id, name);
      await beforeSave(req.body);
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) throw notFoundError(name);
      res.json({ success: true, data: doc });
    }),
    remove: asyncHandler(async (req, res) => {
      checkId(req.params.id, name);
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw notFoundError(name);
      res.json({ success: true, message: `${name} deleted` });
    })
  };
}, { refError });
