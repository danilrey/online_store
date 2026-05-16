const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { validators, constraints, hashPasswordHook, comparePasswordMethod, toPublicJSON, createRef } = require('./modelUtils');

//embedded address schema
const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true, default: 'USA' },
  phone: { type: String, trim: true },
  is_default: { type: Boolean, default: false }
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [constraints.minName, `Name must be at least ${constraints.minName} characters`]
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validators.email.regex, validators.email.message]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [constraints.minPassword, `Password must be at least ${constraints.minPassword} characters`],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  phone: {
    type: String,
    trim: true
  },
  //embedded addresses
  addresses: [addressSchema],
  //shopping cart (embedded)
  cart: [{
    product: createRef('Product'),
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    added_at: {
      type: Date,
      default: Date.now
    }
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  last_login: {
    type: Date
  }
}, {
  timestamps: true
});

//compound index for efficient queries
userSchema.index({ email: 1, is_active: 1 });
userSchema.index({ role: 1, created_at: -1 });

//hash password before saving
userSchema.pre('save', async function(next) {
  await hashPasswordHook.call(this, next, bcrypt);
});

//method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await comparePasswordMethod.call(this, candidatePassword, bcrypt);
};

//method to get public profile
userSchema.methods.toPublicJSON = function() {
  return toPublicJSON.call(this);
};

module.exports = mongoose.model('User', userSchema);
