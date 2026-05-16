const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

//public routes
router.post('/register', register);
router.post('/login', login);

//protected routes
router.get('/me', protect, getMe);

module.exports = router;
