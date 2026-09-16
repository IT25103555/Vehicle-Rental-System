const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

const parseDateRange = (query) => {
  const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), 0, 1);
  const to = query.to ? new Date(query.to) : new Date();
  return { from, to };
};

// @desc    Total bookings report
// @route   GET /api/reports/bookings
// @access  Private/Admin
const bookingsReport = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);

  const [byStatus, total] = await Promise.all([
    Booking.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    Booking.countDocuments({ createdAt: { $gte: from, $lte: to } })
  ]);

  // EX2: No data available for the selected report period
  if (total === 0) {
    return res.json({ success: true, message: 'No data available for the selected report period.', data: [] });
  }

  res.json({ success: true, range: { from, to }, total, byStatus, data: byStatus });
});

// @desc    Revenue report (Finance Manager - daily/monthly income)
// @route   GET /api/reports/revenue
// @access  Private/Admin
const revenueReport = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);
  const groupBy = req.query.groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m';

  const result = await Payment.aggregate([
    { $match: { status: 'Success', type: { $ne: 'Refund' }, createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $dateToString: { format: groupBy, date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const refunds = await Payment.aggregate([
    { $match: { status: 'Refunded', createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: null, totalRefunded: { $sum: '$amount' } } }
  ]);

  if (result.length === 0) {
    return res.json({ success: true, message: 'No data available for the selected report period.', data: [] });
  }

  res.json({
    success: true,
    range: { from, to },
    totalRevenue: result.reduce((s, r) => s + r.revenue, 0),
    totalRefunded: refunds[0]?.totalRefunded || 0,
    data: result
  });
});

// @desc    Most rented / most popular vehicles report
// @route   GET /api/reports/vehicle-usage
// @access  Private/Admin
const vehicleUsageReport = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);

  const usage = await Booking.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to }, status: { $ne: 'Cancelled' } } },
    {
      $group: {
        _id: '$vehicle',
        totalBookings: { $sum: 1 },
        totalRevenue: { $sum: '$estimatedCost' },
        totalDaysRented: { $sum: '$rentalDays' }
      }
    },
    { $sort: { totalBookings: -1 } },
    { $limit: 20 },
    {
      $lookup: { from: 'vehicles', localField: '_id', foreignField: '_id', as: 'vehicle' }
    },
    { $unwind: '$vehicle' },
    {
      $project: {
        _id: 0,
        vehicleId: '$vehicle._id',
        name: '$vehicle.name',
        brand: '$vehicle.brand',
        category: '$vehicle.category',
        totalBookings: 1,
        totalRevenue: 1,
        totalDaysRented: 1
      }
    }
  ]);

  if (usage.length === 0) {
    return res.json({ success: true, message: 'No data available for the selected report period.', data: [] });
  }

  res.json({ success: true, range: { from, to }, data: usage });
});

// @desc    Customer activity report
// @route   GET /api/reports/customer-activity
// @access  Private/Admin
const customerActivityReport = asyncHandler(async (req, res) => {
  const { from, to } = parseDateRange(req.query);

  const activity = await Booking.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: '$customer',
        totalBookings: { $sum: 1 },
        totalSpent: { $sum: '$estimatedCost' },
        lastBookingAt: { $max: '$createdAt' }
      }
    },
    { $sort: { totalBookings: -1 } },
    { $limit: 50 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'customer' } },
    { $unwind: '$customer' },
    {
      $project: {
        _id: 0,
        customerId: '$customer._id',
        name: '$customer.name',
        email: '$customer.email',
        totalBookings: 1,
        totalSpent: 1,
        lastBookingAt: 1
      }
    }
  ]);

  res.json({ success: true, range: { from, to }, data: activity });
});

// @desc    Admin dashboard summary (System Administrator / Business Owner overview)
// @route   GET /api/reports/dashboard
// @access  Private/Admin
const dashboardSummary = asyncHandler(async (req, res) => {
  const [totalCustomers, totalVehicles, availableVehicles, activeBookings, pendingBookings, revenueAgg] =
    await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Vehicle.countDocuments({ isDeleted: false }),
      Vehicle.countDocuments({ isDeleted: false, status: 'Available' }),
      Booking.countDocuments({ status: { $in: ['Confirmed', 'Ongoing'] } }),
      Booking.countDocuments({ status: 'Pending' }),
      Payment.aggregate([
        { $match: { status: 'Success', type: { $ne: 'Refund' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

  res.json({
    success: true,
    data: {
      totalCustomers,
      totalVehicles,
      availableVehicles,
      activeBookings,
      pendingBookings,
      totalRevenue: revenueAgg[0]?.total || 0
    }
  });
});

module.exports = {
  bookingsReport,
  revenueReport,
  vehicleUsageReport,
  customerActivityReport,
  dashboardSummary
};
