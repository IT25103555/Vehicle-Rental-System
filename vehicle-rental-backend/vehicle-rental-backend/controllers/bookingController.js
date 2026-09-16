const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const sendEmail = require('../utils/sendEmail');

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const isOverlapping = async (vehicleId, startDate, endDate, excludeBookingId = null) => {
  const query = {
    vehicle: vehicleId,
    status: { $in: ['Pending', 'Confirmed', 'Ongoing'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate }
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };
  const clash = await Booking.findOne(query);
  return !!clash;
};

// @desc    Create a booking (Business rule: cannot book a reserved/under-maintenance vehicle)
// @route   POST /api/bookings
// @access  Private/Customer
// UC-03 Main Scenario steps 1-4 / Extension 4a (EX1)
const createBooking = asyncHandler(async (req, res) => {
  const { vehicleId, startDate, endDate, pickupLocation, returnLocation } = req.body;

  if (!vehicleId || !startDate || !endDate) {
    res.status(400);
    throw new Error('vehicleId, startDate and endDate are required.');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end) || end <= start) {
    res.status(400);
    throw new Error('Please provide a valid rental period (endDate must be after startDate).');
  }

  const vehicle = await Vehicle.findOne({ _id: vehicleId, isDeleted: false });
  if (!vehicle) {
    res.status(404);
    throw new Error('Vehicle not found.');
  }

  // Business rule: a customer cannot book a vehicle already reserved or under maintenance
  if (vehicle.status !== 'Available') {
    res.status(409);
    throw new Error(`This vehicle is currently ${vehicle.status.toLowerCase()} and cannot be booked.`);
  }

  // EX1: Vehicle is not available for the selected dates
  if (await isOverlapping(vehicleId, start, end)) {
    res.status(409);
    throw new Error('Vehicle is not available for the selected dates. Try different dates or a similar vehicle.');
  }

  const rentalDays = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
  const estimatedCost = rentalDays * vehicle.rentalRatePerDay;

  const booking = await Booking.create({
    customer: req.user._id,
    vehicle: vehicle._id,
    startDate: start,
    endDate: end,
    pickupLocation,
    returnLocation,
    rentalDays,
    estimatedCost,
    status: 'Pending'
  });

  // Vehicle status moves to Reserved once a booking is placed (finalised on payment success)
  vehicle.status = 'Reserved';
  await vehicle.save();

  res.status(201).json({
    success: true,
    message: 'Booking created. Proceed to payment to confirm your reservation.',
    data: booking
  });
});

// @desc    Get my bookings (Booking History - Minor Function 5)
// @route   GET /api/bookings/my
// @access  Private/Customer
const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer: req.user._id })
    .populate('vehicle', 'name brand category images rentalRatePerDay')
    .sort('-createdAt');

  res.json({ success: true, count: bookings.length, data: bookings });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private (owner or admin)
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('vehicle')
    .populate('customer', 'name email phone nic');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found.');
  }

  const isOwner = booking.customer._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('You do not have permission to view this booking.');
  }

  res.json({ success: true, data: booking });
});

// @desc    Modify booking dates (if still Pending/Confirmed, per proposal "Modify booking")
// @route   PUT /api/bookings/:id
// @access  Private (owner or admin)
const updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('vehicle');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found.');
  }

  const isOwner = booking.customer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('You do not have permission to modify this booking.');
  }

  if (!['Pending', 'Confirmed'].includes(booking.status)) {
    res.status(400);
    throw new Error(`Cannot modify a booking that is ${booking.status}.`);
  }

  const { startDate, endDate } = req.body;
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : booking.startDate;
    const end = endDate ? new Date(endDate) : booking.endDate;

    if (end <= start) {
      res.status(400);
      throw new Error('endDate must be after startDate.');
    }
    if (await isOverlapping(booking.vehicle._id, start, end, booking._id)) {
      res.status(409);
      throw new Error('Vehicle is not available for the new dates.');
    }

    booking.startDate = start;
    booking.endDate = end;
    booking.rentalDays = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
    booking.estimatedCost = booking.rentalDays * booking.vehicle.rentalRatePerDay;
  }

  await booking.save();
  res.json({ success: true, message: 'Booking updated.', data: booking });
});

// @desc    Cancel a booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (owner or admin)
// UC-05 Extension 5a (EX2): cannot cancel a completed booking
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('vehicle');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found.');
  }

  const isOwner = booking.customer.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('You do not have permission to cancel this booking.');
  }

  if (booking.status === 'Completed') {
    res.status(400);
    throw new Error('This booking has already been completed and cannot be cancelled.');
  }
  if (booking.status === 'Cancelled') {
    res.status(400);
    throw new Error('This booking is already cancelled.');
  }

  booking.status = 'Cancelled';
  booking.cancelledBy = req.user._id;
  booking.cancellationReason = req.body.reason || 'No reason provided';
  await booking.save();

  // Free up the vehicle again
  if (booking.vehicle && booking.vehicle.status === 'Reserved') {
    booking.vehicle.status = 'Available';
    await booking.vehicle.save();
  }

  await sendEmail({
    to: req.user.email,
    subject: 'Booking Cancelled - Rental.lk',
    text: `Your booking ${booking._id} has been cancelled.`
  });

  res.json({ success: true, message: 'Booking cancelled.', data: booking });
});

// @desc    Admin: approve / confirm a pending booking
// @route   PATCH /api/bookings/:id/approve
// @access  Private/Admin
const approveBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('customer', 'name email');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found.');
  }

  booking.status = 'Confirmed';
  await booking.save();

  await sendEmail({
    to: booking.customer.email,
    subject: 'Booking Confirmed - Rental.lk',
    text: `Hi ${booking.customer.name}, your booking ${booking._id} has been confirmed.`
  });

  res.json({ success: true, message: 'Booking confirmed.', data: booking });
});

// @desc    Mark vehicle as returned / complete the rental, applying any extra charges
// @route   PATCH /api/bookings/:id/complete
// @access  Private/Admin
const completeBooking = asyncHandler(async (req, res) => {
  const { extraCharges = [] } = req.body; // [{ reason, amount }]
  const booking = await Booking.findById(req.params.id).populate('vehicle');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found.');
  }
  if (booking.status === 'Completed') {
    res.status(400);
    throw new Error('Booking is already completed.');
  }

  const extraTotal = extraCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  booking.extraCharges = extraCharges;
  booking.finalCost = booking.estimatedCost + extraTotal;
  booking.status = 'Completed';
  await booking.save();

  if (booking.vehicle) {
    booking.vehicle.status = 'Available';
    await booking.vehicle.save();
  }

  res.json({ success: true, message: 'Booking completed.', data: booking });
});

// @desc    Admin: list/search all bookings (Booking & Customer Management dashboard)
// @route   GET /api/bookings
// @access  Private/Admin
// UC-05 Extension 3a (EX1): no matching booking/customer record found
const getAllBookings = asyncHandler(async (req, res) => {
  const { status, customerId, vehicleId, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (customerId) filter.customer = customerId;
  if (vehicleId) filter.vehicle = vehicleId;

  const skip = (Number(page) - 1) * Number(limit);
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('customer', 'name email phone')
      .populate('vehicle', 'name brand category registrationNo')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Booking.countDocuments(filter)
  ]);

  res.json({
    success: true,
    count: bookings.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    message: bookings.length === 0 ? 'No matching booking records found.' : undefined,
    data: bookings
  });
});

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  approveBooking,
  completeBooking,
  getAllBookings
};
