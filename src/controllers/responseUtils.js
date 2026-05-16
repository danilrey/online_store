function sendError(res, status, message, error) {
  const payload = {
    success: false,
    message
  };

  if (error) {
    payload.error = typeof error === 'string' ? error : error.message;
  }

  return res.status(status).json(payload);
}

function sendSuccess(res, data, message, extra, status = 200) {
  const payload = {
    success: true
  };

  if (message) {
    payload.message = message;
  }

  if (data !== undefined) {
    payload.data = data;
  }

  if (extra && typeof extra === 'object') {
    Object.assign(payload, extra);
  }

  return res.status(status).json(payload);
}

//calculate pagination values
function getPagination(page, limit) {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, skip };
}

//build pagination metadata for response
function buildPaginationMeta(items, total, page, limit) {
  return {
    count: items.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page
  };
}

//handle mongoose validation errors
function handleValidationError(res, error, defaultMessage = 'Validation error') {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(e => e.message).join(', ');
    return sendError(res, 400, messages, error);
  }
  return sendError(res, 400, defaultMessage, error);
}

module.exports = {
  sendError,
  sendSuccess,
  getPagination,
  buildPaginationMeta,
  handleValidationError
};
