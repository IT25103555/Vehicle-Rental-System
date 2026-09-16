const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Toyota Axio"
    registrationNo: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Car', 'Van', 'SUV', 'Bike', 'Lorry', 'Bus']
    },
    brand: { type: String, required: true, trim: true },
    model: { type: String, trim: true },
    year: { type: Number },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Hybrid', 'Electric'],
      default: 'Petrol'
    },
    transmission: {
      type: String,
      enum: ['Manual', 'Automatic'],
      default: 'Manual'
    },
    seats: { type: Number, default: 4 },
    rentalRatePerDay: { type: Number, required: true },
    ratePerKm: { type: Number, default: 0 },
    location: { type: String, default: 'Colombo' },
    description: { type: String, trim: true },
    images: [{ type: String }], // URLs
    status: {
      type: String,
      enum: ['Available', 'Reserved', 'Rented', 'Under Maintenance', 'Unavailable'],
      default: 'Available'
    },
    mileage: { type: Number, default: 0 }, // for maintenance scheduling
    nextServiceDueMileage: { type: Number },
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false } // soft delete for "remove unavailable vehicle"
  },
  { timestamps: true }
);

vehicleSchema.index({ category: 1, brand: 1, rentalRatePerDay: 1, status: 1 });
vehicleSchema.index({ name: 'text', brand: 'text', model: 'text' });

module.exports = mongoose.model('Vehicle', vehicleSchema);
