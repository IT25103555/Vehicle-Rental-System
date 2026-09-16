const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const sendEmail = require('../utils/sendEmail');

// The proposal (Limitations #5) specifies a SIMULATED payment gateway for this
// academic project - no real card data is processed or stored.
// Cards ending in an even digit succeed; odd digit simulates a decline, so the
// front end can demo both the happy path and the retry/failure path (EX1/EX2).
const simulateGateway = (cardNumber = '4242424242424242') => {
  const lastDigit = Number(cardNumber.trim().slice(-1));
  const success = !Number.isNaN(lastDigit) ? lastDigit % 2 === 0 : true;
  return {
    success,
    reference: 'SIM-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
    message: success ? 'Payment approved by simulated gateway.' : 'Payment declined by simulated gateway.'
  };
};

// @desc    Process (simulated) payment for a booking
// @route   POST /api/payments
// @access  Private/Customer
// UC-03 steps 5-7 / Extension 6a (EX2)
const makePayment = asyncHandler(async (req, res) => {
  const { bookingId, method = 'Card', cardNumber } = req.body;

  if (!bookingId) {
    res.status(400);
    throw new Error('bookingId is required.');
  }

  const booking = await Booking.findById(bookingId).populate('vehicle');
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found.');
  }

  const isOwner = booking.customer.toString() === req.user._id.toString();
  if (!isOwner) {
    res.status(403);
    throw new Error('You do not have permission to pay for this booking.');
  }

  // Prevent duplicate payment for an already-paid booking
  const existingSuccessfulPayment = await Payment.findOne({ booking: booking._id, status: 'Success' });
  if (existingSuccessfulPayment) {
    res.status(409);
    throw new Error('A successful payment already exists for this booking. Duplicate payment prevented.');
  }

  const gatewayResult = simulateGateway(cardNumber);

  const payment = await Payment.create({
    booking: booking._id,
    customer: req.user._id,
    amount: booking.estimatedCost,
    method,
    type: 'Full Payment',
    cardLast4: cardNumber ? cardNumber.slice(-4) : undefined,
    transactionRef: gatewayResult.reference,
    status: gatewayResult.success ? 'Success' : 'Failed',
    gatewayResponse: gatewayResult.message
  });

  if (gatewayResult.success) {
    booking.status = 'Confirmed';
    booking.paymentStatus = 'Paid';
    await booking.save();

    if (booking.vehicle) {
      booking.vehicle.status = 'Reserved';
      await booking.vehicle.save();
    }

    await sendEmail({
      to: req.user.email,
      subject: 'Payment Confirmation - Rental.lk',
      text: `Payment of LKR ${payment.amount} received for booking ${booking._id}. Ref: ${payment.transactionRef}`
    });

    return res.status(201).json({
      success: true,
      message: 'Payment successful. Booking confirmed.',
      data: { payment, booking }
    });
  }

  // EX2: Payment fails to process - customer may retry
  booking.paymentStatus = 'Failed';
  await booking.save();

  res.status(402).json({
    success: false,
    message: 'Payment failed. Please try again or use a different payment method.',
    data: { payment }
  });
});

// @desc    Get payment history for the logged-in customer
// @route   GET /api/payments/my
// @access  Private/Customer
const getMyPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ customer: req.user._id })
    .populate('booking')
    .sort('-createdAt');
  res.json({ success: true, count: payments.length, data: payments });
});

// @desc    Admin: process a refund for a cancelled booking
// @route   POST /api/payments/:bookingId/refund
// @access  Private/Admin
const processRefund = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found.');
  }

  const originalPayment = await Payment.findOne({ booking: booking._id, status: 'Success' });
  if (!originalPayment) {
    res.status(400);
    throw new Error('No successful payment found for this booking to refund.');
  }

  const refund = await Payment.create({
    booking: booking._id,
    customer: booking.customer,
    amount: req.body.amount || originalPayment.amount,
    method: originalPayment.method,
    type: 'Refund',
    transactionRef: 'REF-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
    status: 'Refunded',
    gatewayResponse: 'Refund processed (simulated).'
  });

  booking.paymentStatus = 'Refunded';
  await booking.save();

  res.status(201).json({ success: true, message: 'Refund processed.', data: refund });
});

// @desc    Admin: list all payments (Finance Manager view - payment reports)
// @route   GET /api/payments
// @access  Private/Admin
const getAllPayments = asyncHandler(async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;

  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('customer', 'name email')
      .populate('booking')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(filter)
  ]);

  res.json({
    success: true,
    count: payments.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: payments
  });
});

module.exports = { makePayment, getMyPayments, processRefund, getAllPayments };
