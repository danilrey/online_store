const Product = require('../models/Product');
const { sendError, sendSuccess, getPagination, buildPaginationMeta, handleValidationError } = require('./responseUtils');

//desc - get all products with filtering, sorting, pagination
//route - get /api/products
//access - public
exports.getProducts = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      sort = '-createdAt',
      page = 1,
      limit = 12
    } = req.query;

    //build query
    const query = {};
    const includeInactive = req.user?.role === 'admin' && String(req.query.includeInactive).toLowerCase() === 'true';

    if (!includeInactive) {
      query.is_active = true;
    }

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$text = { $search: search };
    }

    //execute a query with pagination
    const { page: pageNum, limit: limitNum, skip } = getPagination(page, limit);
    const products = await Product.find(query)
      .sort(sort)
      .limit(limitNum)
      .skip(skip);

    const total = await Product.countDocuments(query);

    return sendSuccess(res, products, null, buildPaginationMeta(products, total, pageNum, limitNum));
  } catch (error) {
    return sendError(res, 500, 'Error fetching products', error);
  }
};

//desc - get a single product by id
//route - get /api/products/:id
//access - public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, product);
  } catch (error) {
    return sendError(res, 500, 'Error fetching product', error);
  }
};

//desc - create new product
//route - post /api/products
//access - private/admin
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    return sendSuccess(res, product, 'Product created successfully', null, 201);
  } catch (error) {
    return handleValidationError(res, error, 'Error creating product');
  }
};

//desc - update product with advanced operators
//route - put /api/products/:id
//access - private/admin
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, product, 'Product updated successfully');
  } catch (error) {
    return handleValidationError(res, error, 'Error updating product');
  }
};

//desc - update product stock (increment/decrement)
//route - patch /api/products/:id/stock
//access - private/admin
exports.updateStock = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity === 0) {
      return sendError(res, 400, 'Quantity is required and cannot be zero');
    }

    //use $inc to increment or decrement stock
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { stock: quantity } },
      { new: true, runValidators: true }
    );

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, product, 'Stock updated successfully');
  } catch (error) {
    return sendError(res, 400, 'Error updating stock', error);
  }
};

//desc - add tag to product
//route - patch /api/products/:id/tags
//access - private/admin
exports.addTag = async (req, res) => {
  try {
    const { tag } = req.body;

    if (!tag) {
      return sendError(res, 400, 'Tag is required');
    }

    //use $push to add a tag
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $push: { tags: tag } },
      { new: true }
    );

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, product, 'Tag added successfully');
  } catch (error) {
    return sendError(res, 400, 'Error adding tag', error);
  }
};

//desc - remove tag from product
//route - delete /api/products/:id/tags/:tag
//access - private/admin
exports.removeTag = async (req, res) => {
  try {
    const { tag } = req.params;

    //use $pull to remove tag
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $pull: { tags: tag } },
      { new: true }
    );

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, product, 'Tag removed successfully');
  } catch (error) {
    return sendError(res, 400, 'Error removing tag', error);
  }
};

//desc - delete product
//route - delete /api/products/:id
//access - private/admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    return sendSuccess(res, {}, 'Product deleted successfully');
  } catch (error) {
    return sendError(res, 500, 'Error deleting product', error);
  }
};
