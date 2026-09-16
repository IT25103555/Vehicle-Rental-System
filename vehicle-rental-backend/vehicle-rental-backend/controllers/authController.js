const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const validator = require('validator');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

// @desc    Register a new customer account
// @route   POST /api/auth/register
// @access  Public
// UC-01 Main Scenario steps 1-7 / Extension 3a (EX1) / 5a (EX2)
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, nic, drivingLicenseNo } = req.body;

  // Step 4: System validates the format of the entered data (EX1)
  if (!name || !email || !password || !phone || !nic) {
    res.status(400);
    throw new Error('Name, email, password, phone and NIC are all required.');
  }
  if (!validator.isEmail(email)) {
    res.status(400);
    throw new Error('Please provide a valid email address.');
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters long.');
  }

  // Step 5: System checks whether the email/NIC is already registered (EX2)
  const existing = await User.findOne({ $or: [{ email }, { nic }] });
  if (existing) {
    res.status(409);
    throw new Error('Email or NIC is already registered. Please log in instead.');
  }

  // Step 6: System encrypts the password and creates the account (handled in User pre-save hook)
  const user = await User.create({ name, email, password, phone, nic, drivingLicenseNo });

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Rental.lk',
    text: `Hi ${user.name}, your account has been created successfully.`
  });

  // Step 7: confirmation + authenticated session
  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    token: generateToken(user._id, user.role),
    user: user.toSafeObject()
  });
});

// @desc    Login (customer or administrator)
// @route   POST /api/auth/login
// @access  Public
// UC-01 Extension 5b (EX3)
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password.');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid credentials. Please try again.');
  }

  if (user.status === 'suspended') {
    res.status(403);
    throw new Error('Your account has been suspended. Please contact support.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Login successful.',
    token: generateToken(user._id, user.role),
    user: user.toSafeObject()
  });
});

// @desc    Get current logged-in user's profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// @desc    Update profile (Minor Function 3)
// @route   PUT /api/auth/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, drivingLicenseNo } = req.body;

  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (drivingLicenseNo) user.drivingLicenseNo = drivingLicenseNo;

  await user.save();
  res.json({ success: true, message: 'Profile updated.', user: user.toSafeObject() });
});

// @desc    Change password while logged in
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect.');
  }
  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters.');
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully.' });
});

// @desc    Request password reset (Minor Function 2)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  // Do not reveal whether the email exists (security best practice)
  if (!user) {
    return res.json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.'
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save({ validateBeforeSave: false });

  await sendEmail({
    to: user.email,
    subject: 'Password Reset - Rental.lk',
    text: `Use this token to reset your password (valid 15 min): ${resetToken}`
  });

  res.json({
    success: true,
    message: 'If that email is registered, a reset link has been sent.'
  });
});

// @desc    Reset password using token from email
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Token is invalid or has expired.');
  }

  if (!req.body.password || req.body.password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters.');
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password has been reset. Please log in.' });
});

// @desc    Logout (stateless JWT - client just discards token; endpoint kept for parity with UC-01)
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,
  logout
};
