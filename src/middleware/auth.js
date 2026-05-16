const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../controllers/responseUtils');

//extract token from authorization header
const extractToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

//verify token and get user
const verifyTokenAndGetUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return await User.findById(decoded.id).select('-password');
};

//validate user is active
const validateUser = (user) => {
  if (!user) {
    return { valid: false, message: 'User no longer exists' };
  }

  if (!user.is_active) {
    return { valid: false, message: 'User account is deactivated' };
  }

  return { valid: true };
};

//verify jwt token
exports.protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return sendError(res, 401, 'Not authorized to access this route. Please login.');
    }

    try {
      req.user = await verifyTokenAndGetUser(token);

      const validation = validateUser(req.user);
      if (!validation.valid) {
        return sendError(res, 401, validation.message);
      }

      next();
    } catch (error) {
      return sendError(res, 401, 'Invalid or expired token');
    }
  } catch (error) {
    return sendError(res, 500, 'Authentication error', error);
  }
};

//restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, 'You do not have permission to perform this action');
    }
    next();
  };
};

//optional authentication (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      try {
        req.user = await verifyTokenAndGetUser(token);
      } catch (error) {
        //token is invalid, but we don't fail the request
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next();
  }
};
