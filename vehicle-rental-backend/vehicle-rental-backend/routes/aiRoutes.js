const express = require('express');
const router = express.Router();
const { getRecommendations, predictDemand, modelComparison } = require('../controllers/aiController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/recommendations', protect, getRecommendations);
router.get('/predict-demand', protect, restrictTo('admin'), predictDemand);
router.get('/model-comparison', protect, restrictTo('admin'), modelComparison);

module.exports = router;
