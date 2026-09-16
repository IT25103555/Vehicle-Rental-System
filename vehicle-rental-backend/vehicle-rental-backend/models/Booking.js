const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    pickupLocation: { type: String, default: 'Colombo' },
    returnLocation: { type: String, default: 'Colombo' },
    rentalDays: { type: Number, required: true },
    estimatedCost: { type: Number, required: true },
    finalCost: { type: Number }, // set on return, may include penalties/extra charges
    extraCharges: [
      {
        reason: String, // e.g. "Late return", "Extra mileage", "Damage"
        amount: Number
      }
    ],
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled'],
      default: 'Pending'
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Refunded', 'Failed'],
      default: 'Unpaid'
    },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: String,
    adminNotes: String
  },
  { timestamps: true }
);

bookingSchema.index({ vehicle: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ customer: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
