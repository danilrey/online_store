const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  addAddress,
  updateAddress,
  removeAddress,
  addToCart,
  removeFromCart,
  clearCart
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

//all routes are protected
router.get('/:id', protect, getUserProfile);
router.put('/:id', protect, updateUserProfile);
router.post('/:id/addresses', protect, addAddress);
router.patch('/:id/addresses/:addressId', protect, updateAddress);
router.delete('/:id/addresses/:addressId', protect, removeAddress);

//cart routes
router.post('/cart', protect, addToCart);
router.delete('/cart/:productId', protect, removeFromCart);
router.delete('/cart', protect, clearCart);

module.exports = router;
