/**
 * Demo-data seeder: booking history.
 * Run AFTER seedVehicles.js, from inside vehicle-rental-backend/vehicle-rental-backend:
 *
 *   node seedBookings.js
 *
 * This creates realistic-looking booking history spread over the last 6 months,
 * using your REAL registered customer accounts and the demo vehicles just seeded.
 * Without this, demand prediction / pattern analysis / recommendations have
 * nothing to work with - an empty collection makes every AI endpoint return
 * "no data", which looks broken even though the code is correct.
 *
 * Safe to re-run - it only removes bookings it previously added (marked via
 * a note in adminNotes), so it won't touch real bookings customers make later.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Booking = require('./models/Booking');

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

const DEMO_MARKER = 'DEMO-SEED-BOOKING';

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI not found - make sure .env exists in this folder.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB:', uri);

  const customers = await User.find({ role: 'customer' });
  const vehicles = await Vehicle.find({ registrationNo: { $regex: '^DEMO-' } });

  if (customers.length === 0) {
    console.error('No customer accounts found. Register at least one account on the frontend first, then re-run this.');
    process.exit(1);
  }
  if (vehicles.length === 0) {
    console.error('No demo vehicles found. Run "node seedVehicles.js" first.');
    process.exit(1);
  }

  const removed = await Booking.deleteMany({ adminNotes: DEMO_MARKER });
  console.log(`Cleared ${removed.deletedCount} previous demo booking(s).`);

  const bookings = [];
  const totalBookings = 60; // spread across the last 180 days

  for (let i = 0; i < totalBookings; i++) {
    const customer = pick(customers);
    const vehicle = pick(vehicles);
    const rentalDays = randInt(1, 6);
    const startOffset = randInt(1, 180); // 1 to 180 days ago
    const startDate = daysAgo(startOffset);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + rentalDays);

    const estimatedCost = Math.round(vehicle.rentalRatePerDay * rentalDays);
    // Most past bookings are Completed (so they count as real history);
    // a few are Cancelled, to make the data look genuinely real rather than perfect.
    const status = Math.random() < 0.88 ? 'Completed' : 'Cancelled';

    bookings.push({
      customer: customer._id,
      vehicle: vehicle._id,
      startDate,
      endDate,
      rentalDays,
      estimatedCost,
      finalCost: status === 'Completed' ? estimatedCost : undefined,
      status,
      paymentStatus: status === 'Completed' ? 'Paid' : 'Refunded',
      adminNotes: DEMO_MARKER
    });
  }

  const inserted = await Booking.insertMany(bookings);
  console.log(`Inserted ${inserted.length} demo bookings across the last 180 days.`);
  console.log(`Used ${customers.length} real customer account(s) and ${vehicles.length} demo vehicles.`);

  await mongoose.disconnect();
  console.log('Done. Your demand prediction, pattern analysis, and recommendation endpoints now have real history to use.');
}

seed().catch(err => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
