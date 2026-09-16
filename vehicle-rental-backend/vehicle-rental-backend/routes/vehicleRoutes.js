const express = require('express');
const router = express.Router();
const {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle
} = require('../controllers/vehicleController');
const { getVehicleReviews } = require('../controllers/reviewController');
const { protect, restrictTo } = require('../middleware/auth');

// Public - Guest/Customer browsing (UC-02, UC-06 Browse Vehicles)
router.get('/', getVehicles);
router.get('/:id', getVehicleById);
router.get('/:vehicleId/reviews', getVehicleReviews);

// Admin only - inventory management (UC-06)
router.post('/', protect, restrictTo('admin'), createVehicle);
router.put('/:id', protect, restrictTo('admin'), updateVehicle);
router.patch('/:id/status', protect, restrictTo('admin'), updateVehicleStatus);
router.delete('/:id', protect, restrictTo('admin'), deleteVehicle);

module.exports = router;
