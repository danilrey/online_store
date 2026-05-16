const mongoose = require('mongoose');
const { generateOrderNumber, constraints, createRef } = require('./modelUtils');

//embedded order item schema
const orderItemSchema = new mongoose.Schema({
  product: createRef('Product'),
  //snapshot of product details at time of order
  product_snapshot: {
    name: String,
    price: Number,
    image: String
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  subtotal: {
    type: Number,
    required: true
  }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  //referenced user
  user: createRef('User'),
  order_number: {
    type: String,
    unique: true,
    required: true
  },
  //embedded order items
  items: [orderItemSchema],
  //embedded shipping address
  shipping_address: {
    name: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true }
  },
  payment_method: {
    type: String,
    required: true,
    enum: ['credit-card', 'paypal', 'kaspi-qr', 'cash-on-delivery']
  },
  order_status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  pricing: {
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  tracking_number: {
    type: String,
    trim: true
  },
  delivered_at: {
    type: Date
  },
  cancelled_at: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [constraints.maxNotes, `Notes cannot exceed ${constraints.maxNotes} characters`]
  }
}, {
  timestamps: true
});

//compound indexes
orderSchema.index({ user: 1, created_at: -1 });
orderSchema.index({ order_status: 1 });
orderSchema.index({ created_at: -1 });

//generate order number before saving
orderSchema.pre('validate', async function(next) {
  if (!this.order_number) {
    this.order_number = generateOrderNumber();
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
