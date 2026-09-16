const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');

/**
 * NOTE ON AI/ML INTEGRATION (UC-04)
 * ----------------------------------
 * The trained AI/ML models now live in a two-part pipeline maintained by the AI teammate:
 *   Node (this backend) -> Java "AI_Recommendation" service (port 8081)
 *                             -> Python "ai-service" (port 5001, holds the actual trained .pkl models)
 *
 * Both getRecommendations and predictDemand below try that pipeline FIRST. If the Java service
 * is down/unreachable (e.g. teammate hasn't started it, or it's not deployed), we fall back to the
 * original rule-based logic that was already here, so the rest of the app/demo is never blocked.
 */
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8081';

// Small helper: never let a slow/dead Java service hang a request - give up after 3s.
async function callAiService(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`AI service responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// @desc    Recommend vehicles for a customer based on their booking history
//          (falls back to generally popular vehicles - Extension 3a/EX1)
// @route   GET /api/ai/recommendations
// @access  Private/Customer
const getRecommendations = asyncHandler(async (req, res) => {
  const customerBookings = await Booking.find({ customer: req.user._id }).populate('vehicle');

  let basis = 'personalized';
  let preferredCategory = null;
  let preferredBrand = null;
  let maxBudget = null;

  if (customerBookings.length > 0) {
    const categoryCounts = {};
    const brandCounts = {};
    let totalSpend = 0;

    customerBookings.forEach((b) => {
      if (!b.vehicle) return;
      categoryCounts[b.vehicle.category] = (categoryCounts[b.vehicle.category] || 0) + 1;
      brandCounts[b.vehicle.brand] = (brandCounts[b.vehicle.brand] || 0) + 1;
      totalSpend += b.vehicle.rentalRatePerDay;
    });

    preferredCategory = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a])[0];
    preferredBrand = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a])[0];
    maxBudget = Math.round((totalSpend / customerBookings.length) * 1.3); // allow some headroom
  } else {
    // EX1: Insufficient data -> show generally popular vehicles instead
    basis = 'popular';
  }

  let recommendations = [];
  let source = 'rule-based-fallback';

  // Try the AI teammate's pipeline first
  try {
    const aiResults = await callAiService('/api/ai/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: String(req.user._id),
        preferredType: preferredCategory,
        maxBudget
      })
    });

    if (Array.isArray(aiResults) && aiResults.length > 0) {
      // Map the Java service's response shape back to Vehicle-like objects so the
      // frontend doesn't need any changes.
      recommendations = aiResults.slice(0, 6).map((r) => ({
        _id: r.vehicleId,
        name: r.name,
        brand: r.brand,
        model: r.model,
        category: r.category,
        rentalRatePerDay: r.rentalRatePerDay,
        matchScore: r.matchScore
      }));
      source = 'ai-service';
    }
  } catch (err) {
    // AI service unreachable/slow - fall through to the rule-based query below
  }

  if (recommendations.length === 0) {
    const filter = { isDeleted: false, status: 'Available' };
    if (preferredCategory) filter.category = preferredCategory;
    if (maxBudget) filter.rentalRatePerDay = { $lte: maxBudget };

    recommendations = await Vehicle.find(filter)
      .sort(preferredBrand ? { averageRating: -1 } : { totalReviews: -1, averageRating: -1 })
      .limit(6);
  }

  // If personalized filter returned too little, top up with generally popular vehicles
  if (recommendations.length < 3) {
    basis = recommendations.length === 0 ? 'popular' : 'personalized+popular';
    const excludeIds = recommendations.map((v) => v._id);
    const fallback = await Vehicle.find({
      isDeleted: false,
      status: 'Available',
      _id: { $nin: excludeIds }
    })
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(6 - recommendations.length);
    recommendations = recommendations.concat(fallback);
  }

  res.json({
    success: true,
    basis, // 'personalized' | 'popular' | 'personalized+popular'
    source, // 'ai-service' | 'rule-based-fallback'
    preferredCategory,
    preferredBrand,
    data: recommendations
  });
});

// @desc    Predict rental demand / trend for a vehicle category (simple moving-average
//          baseline; swap for the trained model's output once available)
// @route   GET /api/ai/predict-demand
// @access  Private/Admin
const predictDemand = asyncHandler(async (req, res) => {
  const { category } = req.query;

  const matchStage = { createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180) } };
  const pipeline = [
    { $match: matchStage },
    { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle' } },
    { $unwind: '$vehicle' },
    ...(category ? [{ $match: { 'vehicle.category': category } }] : []),
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        bookings: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const monthly = await Booking.aggregate(pipeline);

  if (monthly.length === 0) {
    return res.json({
      success: true,
      confidence: 'low',
      message: 'Insufficient historical data for a confident prediction. Flagged as indicative only.',
      predictedNextMonthBookings: 0,
      history: []
    });
  }

  // Simple 3-month moving average as the demo baseline forecast
  const lastThree = monthly.slice(-3).map((m) => m.bookings);
  const predicted = Math.round(lastThree.reduce((a, b) => a + b, 0) / lastThree.length);

  // Extension 4a (EX2): flag low-confidence predictions
  const confidence = monthly.length >= 3 ? 'medium' : 'low';

  // Additionally try the AI teammate's trained model (via Java -> Python) for the upcoming month,
  // purely as an extra data point alongside the moving-average baseline above. If it's unavailable,
  // the response is identical to before - nothing here is required for the baseline to work.
  let trainedModelPrediction = null;
  try {
    const nextMonth = (new Date().getMonth() + 1) % 12 + 1;
    trainedModelPrediction = await callAiService(`/api/ai/predict/demand?month=${nextMonth}`);
  } catch (err) {
    // trained model service unavailable - baseline prediction above still stands
  }

  res.json({
    success: true,
    category: category || 'all',
    confidence,
    predictedNextMonthBookings: predicted,
    trainedModelPrediction, // null if the Java/Python AI pipeline wasn't reachable
    history: monthly
  });
});

// @desc    Compare ML model performance (Node -> Java -> Python real trained-model results)
// @route   GET /api/ai/model-comparison
// @access  Private/Admin
const modelComparison = asyncHandler(async (req, res) => {
  try {
    const result = await callAiService('/api/ai/model-comparison');
    return res.json({ success: true, source: 'ai-service', ...result });
  } catch (err) {
    // AI service unreachable, or train.py hasn't been run yet in ai-service/ -
    // fall back to a clear placeholder rather than a broken response.
    res.json({
      success: true,
      source: 'placeholder',
      note: 'Could not reach the trained-model comparison (is the Java/Python AI pipeline running, and has `python train.py` been run in ai-service/?).',
      models: [
        { name: 'Model A (e.g. Random Forest)', accuracy: null, rmse: null, status: 'pending_training' },
        { name: 'Model B (e.g. Linear Regression)', accuracy: null, rmse: null, status: 'pending_training' }
      ],
      bestModel: null
    });
  }
});

module.exports = { getRecommendations, predictDemand, modelComparison };
