require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const client = require('prom-client');
const path = require('path');
const { sendError } = require('./src/controllers/responseUtils');

//import routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const userRoutes = require('./src/routes/userRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

const app = express();

//prometheus metrics registry
client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  // Buckets cover fast API calls and slower DB-bound requests.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of in-flight HTTP requests'
});

function normalizePath(pathname = '') {
  return pathname
    .replace(/[0-9a-fA-F]{24}/g, ':id') // mongodb objectid
    .replace(/\b\d+\b/g, ':num'); // numeric ids
}

//middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//http metrics middleware
app.use((req, res, next) => {
  if (req.path === '/metrics') {
    return next();
  }

  const startedAt = process.hrtime.bigint();
  httpRequestsInFlight.inc();

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    const rawPath = (req.originalUrl || req.url || req.path || 'unknown').split('?')[0];
    const route = normalizePath(rawPath);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode)
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
    httpRequestsInFlight.dec();

    const logEntry = {
      ts: new Date().toISOString(),
      level: 'info',
      msg: 'http_request',
      method: req.method,
      route,
      status_code: res.statusCode,
      duration_ms: Math.round(durationSeconds * 1000),
      ip: req.ip,
      user_agent: req.headers['user-agent'] || ''
    };

    console.log(JSON.stringify(logEntry));
  });

  next();
});

//serve static files
app.use(express.static(path.join(__dirname, 'public')));


//api routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

//serve html pages
const sendView = (viewName) => (req, res) => res.sendFile(path.join(__dirname, `views/${viewName}`));


app.get('/', sendView('index.html'));
app.get('/login.html', sendView('login.html'));
app.get('/dashboard.html', sendView('dashboard.html'));
app.get('/products.html', sendView('products.html'));
app.get('/cart.html', sendView('cart.html'));
app.get('/product.html', sendView('product.html'));
app.get('/admin.html', sendView('admin.html'));

//register for metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

//error handling middleware
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  return sendError(res, err.status || 500, err.message || 'Internal Server Error', err);
});

//404 handler
app.use((req, res) => {
  return sendError(res, 404, 'Route not found');
});

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cases_store';

if (!process.env.MONGODB_URI) {
  console.warn('MONGODB_URI is not set; falling back to mongodb://localhost:27017/cases_store');
}

mongoose.connect(MONGODB_URI)
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

module.exports = app;
