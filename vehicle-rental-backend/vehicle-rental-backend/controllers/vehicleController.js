const asyncHandler = require('express-async-handler');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

// @desc    List / search / filter vehicles
// @route   GET /api/vehicles
// @access  Public (Guest/Customer - UC-02, UC-06 Browse Vehicles)
// Query params: category, brand, fuelType, transmission, minPrice, maxPrice,
//               availableFrom, availableTo, location, q (text search), sort, page, limit
const getVehicles = asyncHandler(async (req, res) => {
  const {
    category,
    brand,
    fuelType,
    transmission,
    minPrice,
    maxPrice,
    location,
    availableFrom,
    availableTo,
    q,
    sort = '-createdAt',
    page = 1,
    limit = 12
  } = req.query;

  const filter = { isDeleted: false };
  if (category) filter.category = category;
  if (brand) filter.brand = new RegExp(brand, 'i');
  if (fuelType) filter.fuelType = fuelType;
  if (transmission) filter.transmission = transmission;
  if (location) filter.location = new RegExp(location, 'i');
  if (minPrice || maxPrice) {
    filter.rentalRatePerDay = {};
    if (minPrice) filter.rentalRatePerDay.$gte = Number(minPrice);
    if (maxPrice) filter.rentalRatePerDay.$lte = Number(maxPrice);
  }
  if (q) filter.$text = { $search: q };

  let vehicleIdsToExclude = [];
  // Step 3/4: filter by availability for a specific date range (checks against active bookings)
  if (availableFrom && availableTo) {
    const overlapping = await Booking.find({
      status: { $in: ['Pending', 'Confirmed', 'Ongoing'] },
      startDate: { $lt: new Date(availableTo) },
      endDate: { $gt: new Date(availableFrom) }
    }).select('vehicle');
    vehicleIdsToExclude = overlapping.map((b) => b.vehicle);
    filter._id = { $nin: vehicleIdsToExclude };
    filter.status = 'Available';
  } else {
    // EX2: only ever show vehicles not explicitly marked unavailable by default
    if (!filter.status) filter.status = { $ne: 'Unavailable' };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [vehicles, total] = await Promise.all([
    Vehicle.find(filter).sort(sort).skip(skip).limit(Number(limit)),
    Vehicle.countDocuments(filter)
  ]);

  // EX1: No vehicles match the applied filter criteria
  res.json({
    success: true,
    count: vehicles.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    message: vehicles.length === 0 ? 'No results found. Try adjusting your filters.' : undefined,
    data: vehicles
  });
});

// @desc    Get single vehicle with full specification
// @route   GET /api/vehicles/:id
// @access  Public
const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, isDeleted: false });

  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found.');
  }

  // EX2: vehicle may have become unavailable since the list was displayed
  res.json({ success: true, data: vehicle, currentlyAvailable: vehicle.status === 'Available' });
});

// @desc    Add a new vehicle
// @route   POST /api/vehicles
// @access  Private/Admin (UC-06 step 3)
const createVehicle = asyncHandler(async (req, res) => {
  const {
    name, registrationNo, category, brand, model, year,
    fuelType, transmission, seats, rentalRatePerDay, ratePerKm,
    location, description, images
  } = req.body;

  // EX1: Required vehicle fields are missing or invalid
  if (!name || !registrationNo || !category || !brand || !rentalRatePerDay) {
    res.status(400);
    throw new Error('name, registrationNo, category, brand and rentalRatePerDay are required.');
  }

  const vehicle = await Vehicle.create({
    name, registrationNo, category, brand, model, year,
    fuelType, transmission, seats, rentalRatePerDay, ratePerKm,
    location, description, images
  });

  res.status(201).json({ success: true, message: 'Vehicle added.', data: vehicle });
});

// @desc    Update vehicle details
// @route   PUT /api/vehicles/:id
// @access  Private/Admin
const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle || vehicle.isDeleted) {
    res.status(404);
    throw new Error('Vehicle not found.');
  }

  Object.assign(vehicle, req.body);
  await vehicle.save();

  res.json({ success: true, message: 'Vehicle updated.', data: vehicle });
});

// @desc    Update only vehicle status (Available / Under Maintenance / Unavailable ...)
// @route   PATCH /api/vehicles/:id/status
// @access  Private/Admin
const updateVehicleStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['Available', 'Reserved', 'Rented', 'Under Maintenance', 'Unavailable'];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error(`Status must be one of: ${allowed.join(', ')}`);
  }

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found.');
  }

  vehicle.status = status;
  await vehicle.save();

  res.json({ success: true, message: `Vehicle marked as ${status}.`, data: vehicle });
});

// @desc    Remove (soft-delete) a vehicle that is no longer in service
// @route   DELETE /api/vehicles/:id
// @access  Private/Admin
const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found.');
  }

  vehicle.isDeleted = true;
  vehicle.status = 'Unavailable';
  await vehicle.save();

  res.json({ success: true, message: 'Vehicle removed from active inventory.' });
});

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle
};
