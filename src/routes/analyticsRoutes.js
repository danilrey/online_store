const express = require('express');
const router = express.Router();
const {
  getProductStats,
  getTopRatedProducts,
  getSalesAnalytics,
  getSalesTimeSeries,
  getUserOrderHistory,
  getReviewStats,
  getOrderStatusStats
} = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/auth');

//public routes
router.get('/products/top-rated', getTopRatedProducts);
router.get('/reviews/stats', getReviewStats);

//protected routes
router.get('/users/:userId/orders', protect, getUserOrderHistory);

//admin routes
router.get('/products/stats', protect, restrictTo('admin'), getProductStats);
router.get('/sales', protect, restrictTo('admin'), getSalesAnalytics);
router.get('/sales/timeseries', protect, restrictTo('admin'), getSalesTimeSeries);
router.get('/orders/status', protect, restrictTo('admin'), getOrderStatusStats);

module.exports = router;
