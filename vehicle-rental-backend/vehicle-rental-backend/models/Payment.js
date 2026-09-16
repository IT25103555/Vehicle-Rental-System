const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['Card', 'Bank Transfer', 'Cash'],
      default: 'Card'
    },
    type: {
      type: String,
      enum: ['Deposit', 'Full Payment', 'Balance', 'Refund'],
      default: 'Full Payment'
    },
    // Card fields are never stored in real form - only a masked reference,
    // since the project proposal specifies a SIMULATED payment gateway.
    cardLast4: { type: String },
    transactionRef: { type: String, unique: true },
    status: {
      type: String,
      enum: ['Pending', 'Success', 'Failed', 'Refunded'],
      default: 'Pending'
    },
    gatewayResponse: { type: String } // simulated gateway message
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
