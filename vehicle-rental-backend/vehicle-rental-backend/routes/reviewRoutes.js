const express = require('express');
const router = express.Router();
const { createReview, getVehicleReviews, getAllReviews, deleteReview } = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');

// Public - anyone can read reviews for a vehicle before booking it
router.get('/vehicle/:vehicleId', getVehicleReviews);

// Customer - submit a review for a completed booking
router.post('/', protect, createReview);

// Admin - "Manage customer feedback and reviews" (Requirement 7)
router.get('/', protect, restrictTo('admin'), getAllReviews);
router.delete('/:id', protect, restrictTo('admin'), deleteReview);

module.exports = router;
