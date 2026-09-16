const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');

// @desc    List / search users & customer accounts
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const { role, status, q, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
      { nic: new RegExp(q, 'i') }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).skip(skip).limit(Number(limit)).sort('-createdAt'),
    User.countDocuments(filter)
  ]);

  res.json({
    success: true,
    count: users.length,
    total,
    page: Number(page),
    message: users.length === 0 ? 'No matching customer record found.' : undefined,
    data: users.map((u) => u.toSafeObject())
  });
});

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }
  res.json({ success: true, data: user.toSafeObject() });
});

// @desc    Activate or deactivate (suspend) a user account
// @route   PATCH /api/admin/users/:id/status
// @access  Private/Admin
const setUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    res.status(400);
    throw new Error("Status must be 'active' or 'suspended'.");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  user.status = status;
  await user.save();

  res.json({ success: true, message: `User account ${status}.`, data: user.toSafeObject() });
});

// @desc    Create a staff/admin account
// @route   POST /api/admin/users
// @access  Private/Admin
const createStaffUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone, nic, role = 'admin' } = req.body;
  if (!name || !email || !password || !phone || !nic) {
    res.status(400);
    throw new Error('name, email, password, phone and nic are required.');
  }

  const user = await User.create({ name, email, password, phone, nic, role });
  res.status(201).json({ success: true, data: user.toSafeObject() });
});

// ---------- Fleet Maintenance (Operations Manager / Fleet Maintenance Officer) ----------

// @desc    Log a new maintenance/repair record and mark vehicle Under Maintenance
// @route   POST /api/admin/maintenance
// @access  Private/Admin
const createMaintenanceRecord = asyncHandler(async (req, res) => {
  const { vehicleId, type, problemFound, sparePartsUsed, serviceProvider, cost } = req.body;

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found.');
  }

  const record = await Maintenance.create({
    vehicle: vehicleId,
    type,
    problemFound,
    sparePartsUsed,
    serviceProvider,
    cost,
    recordedBy: req.user._id
  });

  vehicle.status = 'Under Maintenance';
  await vehicle.save();

  res.status(201).json({ success: true, message: 'Maintenance record created.', data: record });
});

// @desc    Complete a maintenance record -> vehicle becomes Available again
// @route   PATCH /api/admin/maintenance/:id/complete
// @access  Private/Admin
const completeMaintenanceRecord = asyncHandler(async (req, res) => {
  const record = await Maintenance.findById(req.params.id).populate('vehicle');
  if (!record) {
    res.status(404);
    throw new Error('Maintenance record not found.');
  }

  record.workCompleted = req.body.workCompleted || record.workCompleted;
  record.completedAt = new Date();
  await record.save();

  if (record.vehicle) {
    record.vehicle.status = 'Available';
    if (req.body.newMileage) record.vehicle.mileage = req.body.newMileage;
    await record.vehicle.save();
  }

  res.json({ success: true, message: 'Vehicle marked available after servicing.', data: record });
});

// @desc    List maintenance history (optionally per vehicle)
// @route   GET /api/admin/maintenance
// @access  Private/Admin
const getMaintenanceRecords = asyncHandler(async (req, res) => {
  const { vehicleId } = req.query;
  const filter = {};
  if (vehicleId) filter.vehicle = vehicleId;

  const records = await Maintenance.find(filter).populate('vehicle', 'name registrationNo').sort('-createdAt');
  res.json({ success: true, count: records.length, data: records });
});

module.exports = {
  getUsers,
  getUserById,
  setUserStatus,
  createStaffUser,
  createMaintenanceRecord,
  completeMaintenanceRecord,
  getMaintenanceRecords
};
