const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  approveBooking,
  completeBooking,
  getAllBookings
} = require('../controllers/bookingController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

// Customer
router.post('/', createBooking);
router.get('/my', getMyBookings);
router.put('/:id', updateBooking);
router.patch('/:id/cancel', cancelBooking);
router.get('/:id', getBookingById);

// Admin - Booking & Customer Management (UC-05)
router.get('/', restrictTo('admin'), getAllBookings);
router.patch('/:id/approve', restrictTo('admin'), approveBooking);
router.patch('/:id/complete', restrictTo('admin'), completeBooking);

module.exports = router;
