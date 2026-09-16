const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');

const recalcVehicleRating = async (vehicleId) => {
  const stats = await Review.aggregate([
    { $match: { vehicle: vehicleId } },
    { $group: { _id: '$vehicle', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);

  await Vehicle.findByIdAndUpdate(vehicleId, {
    averageRating: stats[0]?.avg || 0,
    totalReviews: stats[0]?.count || 0
  });
};

// @desc    Submit a review for a completed booking
// @route   POST /api/reviews
// @access  Private/Customer
const createReview = asyncHandler(async (req, res) => {
  const { bookingId, rating, comment } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found.');
  }
  if (booking.customer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You can only review your own bookings.');
  }
  if (booking.status !== 'Completed') {
    res.status(400);
    throw new Error('You can only review a completed rental.');
  }

  const review = await Review.create({
    customer: req.user._id,
    vehicle: booking.vehicle,
    booking: booking._id,
    rating,
    comment
  });

  await recalcVehicleRating(booking.vehicle);

  res.status(201).json({ success: true, message: 'Review submitted. Thank you!', data: review });
});

// @desc    Get reviews for a vehicle
// @route   GET /api/reviews/vehicle/:vehicleId
// @access  Public
const getVehicleReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ vehicle: req.params.vehicleId })
    .populate('customer', 'name')
    .sort('-createdAt');
  res.json({ success: true, count: reviews.length, data: reviews });
});

// @desc    Admin: list ALL customer feedback/reviews across every vehicle, for moderation
// @route   GET /api/reviews
// @access  Private/Admin
// Requirement 7: "Manage customer feedback and reviews" - this is what makes that possible.
const getAllReviews = asyncHandler(async (req, res) => {
  const { minRating, maxRating, vehicleId, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (vehicleId) filter.vehicle = vehicleId;
  if (minRating || maxRating) {
    filter.rating = {};
    if (minRating) filter.rating.$gte = Number(minRating);
    if (maxRating) filter.rating.$lte = Number(maxRating);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('customer', 'name email')
      .populate('vehicle', 'name brand registrationNo')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Review.countDocuments(filter)
  ]);

  res.json({
    success: true,
    count: reviews.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: reviews
  });
});

// @desc    Admin: remove a review (e.g. abusive/spam feedback)
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error('Review not found.');
  }

  const vehicleId = review.vehicle;
  await review.deleteOne();
  await recalcVehicleRating(vehicleId); // keep the vehicle's average rating accurate after removal

  res.json({ success: true, message: 'Review removed.' });
});

module.exports = { createReview, getVehicleReviews, getAllReviews, deleteReview };
