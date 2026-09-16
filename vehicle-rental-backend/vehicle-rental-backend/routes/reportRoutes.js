const express = require('express');
const router = express.Router();
const {
  bookingsReport,
  revenueReport,
  vehicleUsageReport,
  customerActivityReport,
  dashboardSummary
} = require('../controllers/reportController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin'));

router.get('/dashboard', dashboardSummary);
router.get('/bookings', bookingsReport);
router.get('/revenue', revenueReport);
router.get('/vehicle-usage', vehicleUsageReport);
router.get('/customer-activity', customerActivityReport);

module.exports = router;
