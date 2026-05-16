const mongoose = require('mongoose');
const { constraints } = require('./modelUtils');

//compatible models schema
const compatibleModelSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  model_name: { type: String, required: true },
  release_year: { type: Number }
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    minlength: [constraints.minDescription, `Description must be at least ${constraints.minDescription} characters`]
  },
  material: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true
  },
  compatible_models: [compatibleModelSchema],
  category: {
    type: String,
    required: true,
    enum: ['phone-case', 'laptop-case', 'tablet-case', 'watch-case', 'accessory'],
    index: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  images: [{ type: String }], //array of image urls
  brand: {
    type: String,
    trim: true
  },
  //aggregated rating (updated via reviews)
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  tags: [{ type: String }],
  sold_count: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});


//compound indexes for optimization
productSchema.index({ category: 1, price: 1 });
productSchema.index({ 'rating.average': -1, sold_count: -1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ is_active: 1, created_at: -1 });


module.exports = mongoose.model('Product', productSchema);
