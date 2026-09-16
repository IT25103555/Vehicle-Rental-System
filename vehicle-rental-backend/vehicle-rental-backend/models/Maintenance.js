const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    type: { type: String, enum: ['Inspection', 'Service', 'Repair'], default: 'Service' },
    problemFound: { type: String, trim: true },
    workCompleted: { type: String, trim: true },
    sparePartsUsed: { type: String, trim: true },
    serviceProvider: { type: String, trim: true },
    cost: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Maintenance', maintenanceSchema);
