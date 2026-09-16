const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  setUserStatus,
  createStaffUser,
  createMaintenanceRecord,
  completeMaintenanceRecord,
  getMaintenanceRecords
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin'));

router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', setUserStatus);
router.post('/users', createStaffUser);

router.get('/maintenance', getMaintenanceRecords);
router.post('/maintenance', createMaintenanceRecord);
router.patch('/maintenance/:id/complete', completeMaintenanceRecord);

module.exports = router;
