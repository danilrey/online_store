const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { sendError, sendSuccess, getPagination, buildPaginationMeta, handleValidationError } = require('./responseUtils');

//check if user owns the review
const isReviewOwner = (review, userId) => {
  return review.user.toString() === userId.toString();
};

//check if user can delete review (owner or admin)
const canDeleteReview = (review, userId, userRole) => {
  return isReviewOwner(review, userId) || userRole === 'admin';
};

//desc - get reviews for a product
//route - get /api/products/:productId/reviews
//access - public
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { sort = '-createdAt', page = 1, limit = 10 } = req.query;

    const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);

    const reviews = await Review.find({ product: productId })
      .populate('user', 'name')
      .sort(sort)
      .limit(limitNum)
      .skip(skip);

    const total = await Review.countDocuments({ product: productId });

    return sendSuccess(res, reviews, null, buildPaginationMeta(reviews, total, pageNum, limitNum));
  } catch (error) {
    return sendError(res, 500, 'Error fetching reviews', error);
  }
};

//desc - create a review
//route - post /api/reviews
//access - private
exports.createReview = async (req, res) => {
  try {
    const { product, rating, title, comment } = req.body;

    //check if product exists
    const productExists = await Product.findById(product);
    if (!productExists) {
      return sendError(res, 404, 'Product not found');
    }

    //allow reviews only for delivered orders
    const deliveredOrder = await Order.findOne({
      user: req.user._id,
      order_status: 'delivered',
      'items.product': product
    });

    if (!deliveredOrder) {
      return sendError(res, 403, 'Only customers with delivered orders can leave a review');
    }

    //check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user._id,
      product: product
    });

    if (existingReview) {
      return sendError(res, 400, 'You have already reviewed this product');
    }

    //create review
    const review = await Review.create({
      user: req.user._id,
      product,
      rating,
      title,
      comment
    });

    const populatedReview = await Review.findById(review._id)
      .populate('user', 'name')
      .populate('product', 'name');

    return sendSuccess(res, populatedReview, 'Review created successfully', null, 201);
  } catch (error) {
    return handleValidationError(res, error, 'Error creating review');
  }
};

//desc - update a review
//route - put /api/reviews/:id
//access - private
exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    //check if the user owns the review
    if (!isReviewOwner(review, req.user._id)) {
      return sendError(res, 403, 'Not authorized to update this review');
    }

    //update with $set
    const updatedReview = await Review.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('user', 'name');

    return sendSuccess(res, updatedReview, 'Review updated successfully');
  } catch (error) {
    return handleValidationError(res, error, 'Error updating review');
  }
};

//desc - delete a review
//route - delete /api/reviews/:id
//access - private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    //check if user owns the review or is admin
    if (!canDeleteReview(review, req.user._id, req.user.role)) {
      return sendError(res, 403, 'Not authorized to delete this review');
    }

    await review.deleteOne();

    return sendSuccess(res, {}, 'Review deleted successfully');
  } catch (error) {
    return sendError(res, 500, 'Error deleting review', error);
  }
};
