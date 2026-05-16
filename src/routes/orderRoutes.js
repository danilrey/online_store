const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

//all routes are protected
router.post('/', protect, createOrder);
router.get('/', protect, getMyOrders);
router.get('/all', protect, restrictTo('admin'), getAllOrders);
router.get('/:id', protect, getOrder);
router.patch('/:id/status', protect, restrictTo('admin'), updateOrderStatus);
router.delete('/:id', protect, cancelOrder);

module.exports = router;
