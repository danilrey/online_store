const mongoose = require('mongoose');
const { constraints, createRef } = require('./modelUtils');

const reviewSchema = new mongoose.Schema({
  //referenced user
  user: createRef('User'),
  //referenced product
  product: createRef('Product'),
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [constraints.maxTitle, `Title cannot exceed ${constraints.maxTitle} characters`]
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    minlength: [constraints.minDescription, `Comment must be at least ${constraints.minDescription} characters`],
    maxlength: [constraints.maxComment, `Comment cannot exceed ${constraints.maxComment} characters`]
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

//compound indexes
reviewSchema.index({ product: 1, rating: -1 });
reviewSchema.index({ user: 1, product: 1 }, { unique: true }); //one review per user per product
reviewSchema.index({ product: 1, created_at: -1 });

//static method to calculate product rating
reviewSchema.statics.calculateProductRating = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    const Product = mongoose.model('Product');
    await Product.findByIdAndUpdate(productId, {
      'rating.average': Math.round(stats[0].averageRating * 10) / 10,
      'rating.count': stats[0].reviewCount
    });
  }
};

//update product rating after save
reviewSchema.post('save', function() {
  this.constructor.calculateProductRating(this.product);
});

//update product rating after delete
reviewSchema.post('remove', function() {
  this.constructor.calculateProductRating(this.product);
});

module.exports = mongoose.model('Review', reviewSchema);
