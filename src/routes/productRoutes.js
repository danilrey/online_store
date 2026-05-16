const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateStock,
  addTag,
  removeTag,
  deleteProduct
} = require('../controllers/productController');
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

//public routes
router.get('/', optionalAuth, getProducts);
router.get('/:id', getProduct);

//admin routes
router.post('/', protect, restrictTo('admin'), createProduct);
router.put('/:id', protect, restrictTo('admin'), updateProduct);
router.patch('/:id/stock', protect, restrictTo('admin'), updateStock);
router.patch('/:id/tags', protect, restrictTo('admin'), addTag);
router.delete('/:id/tags/:tag', protect, restrictTo('admin'), removeTag);
router.delete('/:id', protect, restrictTo('admin'), deleteProduct);

module.exports = router;
