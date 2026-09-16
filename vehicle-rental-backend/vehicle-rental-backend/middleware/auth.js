const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// UC-01: verifies the entered credentials / authenticates the user session
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized. Please log in.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401);
      throw new Error('User belonging to this token no longer exists.');
    }

    if (user.status === 'suspended') {
      res.status(403);
      throw new Error('Your account has been suspended. Contact support.');
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error('Invalid or expired session. Please log in again.');
  }
});

// "Users should have limited access to the administrator functions even if not allowed to" (NFR - Security)
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error('You do not have permission to perform this action.');
  }
  next();
};

module.exports = { protect, restrictTo };
