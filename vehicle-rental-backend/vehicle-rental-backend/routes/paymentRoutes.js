const express = require('express');
const router = express.Router();
const {
  makePayment,
  getMyPayments,
  processRefund,
  getAllPayments
} = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.post('/', makePayment);
router.get('/my', getMyPayments);

router.get('/', restrictTo('admin'), getAllPayments);
router.post('/:bookingId/refund', restrictTo('admin'), processRefund);

module.exports = router;
