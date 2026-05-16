const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const User = require('../models/User');
const mongoose = require('mongoose');
const { sendError, sendSuccess } = require('./responseUtils');

//build match stage with date range and order status filter
const buildDateRangeMatchStage = (startDate, endDate, excludeCancelled = true) => {
  const matchStage = {};

  if (excludeCancelled) {
    matchStage.order_status = { $nin: ['cancelled'] };
  }

  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return matchStage;
};

//desc - get product statistics with aggregation
//route - get /api/analytics/products/stats
//access - private/admin
exports.getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $match: { is_active: true }
      },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          totalStock: { $sum: '$stock' },
          totalSold: { $sum: '$sold_count' },
          averageRating: { $avg: '$rating.average' }
        }
      },
      {
        $sort: { totalSold: -1 }
      }
    ]);

    return sendSuccess(res, stats);
  } catch (error) {
    return sendError(res, 500, 'Error fetching product statistics', error);
  }
};

//desc - get top-rated products
//route - get /api/analytics/products/top-rated
//access - public
exports.getTopRatedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topProducts = await Product.aggregate([
      {
        $match: {
          is_active: true,
          'rating.count': { $gte: 1 }
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          category: 1,
          price: 1,
          images: 1,
          rating: 1,
          sold_count: 1,
          //calculate weighted score: rating * review count
          score: {
            $multiply: [
              '$rating.average',
              { $ln: { $add: ['$rating.count', 1] } }
            ]
          }
        }
      },
      {
        $sort: { score: -1 }
      },
      {
        $limit: Number(limit)
      }
    ]);

    return sendSuccess(res, topProducts, null, { count: topProducts.length });
  } catch (error) {
    return sendError(res, 500, 'Error fetching top-rated products', error);
  }
};

//desc - get sales analytics
//route - get /api/analytics/sales
//access - private/admin
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = buildDateRangeMatchStage(startDate, endDate);

    const salesData = await Order.aggregate([
      {
        $match: matchStage
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $unwind: '$productDetails'
      },
      {
        $group: {
          _id: {
            productId: '$items.product',
            productName: '$productDetails.name',
            category: '$productDetails.category'
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          orderCount: { $sum: 1 },
          averagePrice: { $avg: '$items.price' }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $limit: 20
      },
      {
        $project: {
          _id: 0,
          productId: '$_id.productId',
          productName: '$_id.productName',
          category: '$_id.category',
          totalQuantity: 1,
          totalRevenue: '$totalRevenue',
          orderCount: '$orderCount',
          averagePrice: '$averagePrice'
        }
      }
    ]);

    //overall summary
    const summary = await Order.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: '$totalOrders',
          totalRevenue: '$totalRevenue',
          averageOrderValue: '$averageOrderValue'
        }
      }
    ]);

    return sendSuccess(res, {
      summary: summary[0] || {},
      topProducts: salesData
    });
  } catch (error) {
    return sendError(res, 500, 'Error fetching sales analytics', error);
  }
};

//desc - get sales time series
//route - get /api/analytics/sales/timeseries
//access - private/admin
exports.getSalesTimeSeries = async (req, res) => {
  try {
    const { startDate, endDate, interval = 'day' } = req.query;

    const matchStage = buildDateRangeMatchStage(startDate, endDate);

    const format = interval === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const series = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdAt' } },
          totalRevenue: { $sum: '$pricing.total' },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          totalRevenue: '$totalRevenue',
          totalOrders: '$totalOrders'
        }
      }
    ]);

    return sendSuccess(res, series);
  } catch (error) {
    return sendError(res, 500, 'Error fetching sales time series', error);
  }
};

//desc - get order status statistics
//route - get /api/analytics/orders/status
//access - private/admin
exports.getOrderStatusStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$order_status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return sendSuccess(res, stats);
  } catch (error) {
    return sendError(res, 500, 'Error fetching order status statistics', error);
  }
};

//desc - get user order history with details
//route - get /api/analytics/users/:userId/orders
//access - private
exports.getUserOrderHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'Invalid user id');
    }

    //check authorization
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const orderHistory = await Order.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $project: {
          order_number: 1,
          order_status: 1,
          createdAt: 1,
          'pricing.total': 1,
          itemCount: { $size: '$items' },
          items: {
            $map: {
              input: '$items',
              as: 'item',
              in: {
                productName: '$$item.productSnapshot.name',
                quantity: '$$item.quantity',
                price: '$$item.price',
                subtotal: '$$item.subtotal'
              }
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    //calculate user statistics
    const userStats = await Order.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          order_status: { $nin: ['cancelled'] }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalSpent: { $round: ['$totalSpent', 2] },
          averageOrderValue: { $round: ['$averageOrderValue', 2] }
        }
      }
    ]);

    return sendSuccess(res, {
      statistics: userStats[0] || {},
      orders: orderHistory
    });
  } catch (error) {
    return sendError(res, 500, 'Error fetching user order history', error);
  }
};

//desc - get review statistics
//route - get /api/analytics/reviews/stats
//access - public
exports.getReviewStats = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    const totalReviews = stats.reduce((sum, stat) => sum + stat.count, 0);
    const averageRating = stats.reduce(
      (sum, stat) => sum + (stat._id * stat.count), 0) / totalReviews || 0;

    return sendSuccess(res, {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      distribution: stats
    });
  } catch (error) {
    return sendError(res, 500, 'Error fetching review statistics', error);
  }
};
