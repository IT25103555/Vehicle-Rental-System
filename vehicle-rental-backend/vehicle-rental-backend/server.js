require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

connectDB();

const app = express();

// ---- Security & core middleware (NFR: Security, Performance) ----
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Basic rate limiting to reduce brute-force / abuse risk on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Vehicle Rental System API is running.' });
});

// ---- Routes (mapped to the 6 major use cases) ----
app.use('/api/auth', authRoutes);          // UC-01 User Registration & Authentication
app.use('/api/vehicles', vehicleRoutes);   // UC-02 Vehicle Search & Browsing / UC-06 Inventory
app.use('/api/bookings', bookingRoutes);   // UC-03 Booking / UC-05 Booking & Customer Management
app.use('/api/payments', paymentRoutes);   // UC-03 Payment (simulated gateway)
app.use('/api/ai', aiRoutes);              // UC-04 AI Recommendation & Prediction
app.use('/api/admin', adminRoutes);        // UC-05 Customer Management + Maintenance
app.use('/api/reports', reportRoutes);     // UC-06 Reporting & Dashboard
app.use('/api/reviews', reviewRoutes);     // Minor Function: Reviews & Ratings

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = app;
