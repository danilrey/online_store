const User = require('../models/User');
const Product = require('../models/Product');
const { sendError, sendSuccess, handleValidationError } = require('./responseUtils');

//check if user can access resource (owner or admin)
const canAccessResource = (userId, targetId, userRole) => {
  return userId.toString() === targetId || userRole === 'admin';
};

//check if user is resource owner (strict)
const isResourceOwner = (userId, targetId) => {
  return userId.toString() === targetId;
};

//set address as default and unset others
const setDefaultAddress = (user, targetAddressId) => {
  user.addresses.forEach(addr => {
    addr.is_default = addr._id.toString() === targetAddressId;
  });
};

//desc - get user profile
//route - get /api/users/:id
//access - private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    //users can only view their own profile unless admin
    if (!canAccessResource(req.user._id, req.params.id, req.user.role)) {
      return sendError(res, 403, 'Not authorized to view this profile');
    }

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, 500, 'Error fetching user profile', error);
  }
};

//desc - update user profile
//route - put /api/users/:id
//access - private
exports.updateUserProfile = async (req, res) => {
  try {
    //users can only update their own profile
    if (!canAccessResource(req.user._id, req.params.id, req.user.role)) {
      return sendError(res, 403, 'Not authorized to update this profile');
    }

    const { name, phone, addresses } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (addresses) updateData.addresses = addresses;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, user, 'Profile updated successfully');
  } catch (error) {
    return handleValidationError(res, error, 'Error updating profile');
  }
};

//desc - add address to user
//route - post /api/users/:id/addresses
//access - private
exports.addAddress = async (req, res) => {
  try {
    if (!isResourceOwner(req.user._id, req.params.id)) {
      return sendError(res, 403, 'Not authorized');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const address = req.body;
    if (address.is_default) {
      user.addresses.forEach(addr => addr.is_default = false);
    }

    user.addresses.push(address);
    await user.save();

    return sendSuccess(res, user, 'Address added successfully');
  } catch (error) {
    return handleValidationError(res, error, 'Error adding address');
  }
};

//desc - update address
//route - patch /api/users/:id/addresses/:addressId
//access - private
exports.updateAddress = async (req, res) => {
  try {
    if (!isResourceOwner(req.user._id, req.params.id)) {
      return sendError(res, 403, 'Not authorized');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return sendError(res, 404, 'Address not found');
    }

    const { street, city, country, phone, is_default } = req.body;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (country !== undefined) address.country = country;
    if (phone !== undefined) address.phone = phone;

    if (is_default === true) {
      setDefaultAddress(user, req.params.addressId);
    } else if (is_default === false) {
      address.is_default = false;
    }

    await user.save();

    return sendSuccess(res, user, 'Address updated successfully');
  } catch (error) {
    return handleValidationError(res, error, 'Error updating address');
  }
};

//desc - remove address from user
//route - delete /api/users/:id/addresses/:addressId
//access - private
exports.removeAddress = async (req, res) => {
  try {
    if (!isResourceOwner(req.user._id, req.params.id)) {
      return sendError(res, 403, 'Not authorized');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { addresses: { _id: req.params.addressId } } },
      { new: true }
    ).select('-password');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, user, 'Address removed successfully');
  } catch (error) {
    return sendError(res, 400, 'Error removing address', error);
  }
};

//desc - add product to cart
//route - post /api/users/cart
//access - private
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    //check if product exists and get stock
    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    //check if product already in cart
    const user = await User.findById(req.user._id);
    const cartItemIndex = user.cart.findIndex(
      item => item.product.toString() === productId
    );

    let currentQuantity = 0;
    if (cartItemIndex > -1) {
      currentQuantity = user.cart[cartItemIndex].quantity;
    }

    //calculate how much we can actually add (limit by stock)
    const availableToAdd = product.stock - currentQuantity;
    const actualQuantityToAdd = Math.min(quantity, availableToAdd);

    //if nothing to add, return current cart
    if (actualQuantityToAdd <= 0) {
      const updatedUser = await User.findById(req.user._id)
        .populate('cart.product')
        .select('-password');
      return sendSuccess(res, updatedUser.cart, 'Product already at maximum stock in cart');
    }

    if (cartItemIndex > -1) {
      //update quantity using positional operator $
      await User.findOneAndUpdate(
        { _id: req.user._id, 'cart.product': productId },
        { $inc: { 'cart.$.quantity': actualQuantityToAdd } },
        { new: true }
      );
    } else {
      //add new item to cart
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $push: {
            cart: {
              product: productId,
              quantity: actualQuantityToAdd
            }
          }
        },
        { new: true }
      );
    }

    const updatedUser = await User.findById(req.user._id)
      .populate('cart.product')
      .select('-password');

    return sendSuccess(res, updatedUser.cart, 'Product added to cart');
  } catch (error) {
    return handleValidationError(res, error, 'Error adding to cart');
  }
};

//desc - remove product from cart
//route - delete /api/users/cart/:productId
//access - private
exports.removeFromCart = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { cart: { product: req.params.productId } } },
      { new: true }
    ).populate('cart.product').select('-password');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, user.cart, 'Product removed from cart');
  } catch (error) {
    return sendError(res, 400, 'Error removing from cart', error);
  }
};

//desc - clear cart
//route - delete /api/users/cart
//access - private
exports.clearCart = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { cart: [] } },
      { new: true }
    ).select('-password');

    return sendSuccess(res, user.cart, 'Cart cleared successfully');
  } catch (error) {
    return sendError(res, 400, 'Error clearing cart', error);
  }
};
