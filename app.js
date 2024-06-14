const path = require('path');
const express = require('express');
const fs = require('fs');
const morgan = require('morgan'); // Logging
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1] GLOBAL MIDDELWARES
// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// SET Security HTTP headers
app.use(
  // helmet()
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://js.stripe.com'],
        imgSrc: ["'self'", 'data:'],
        frameSrc: ["'self'", 'https://js.stripe.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        connectSrc: ["'self'", 'ws://127.0.0.1:*'],
        // Add other necessary directives
      },
    },
  }),
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// Limit requets from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, Please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from the body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'maxGroupSize',
      'difficulty',
      'ratingsAverage',
      'ratingsQuantity',
      'price',
    ],
  }),
);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// Handle requests for bundle.js.map
app.use('/bundle.js.map', (req, res) => {
  res.status(404).end();
});

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`),
);

// 3] ROUTES

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// HANDLING unhandled Routes
app.all('*', (req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl} on this Server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't find ${req.originalUrl} on this Server!`, 404));
});

// Global Error Handling Middelware
app.use(globalErrorHandler);

module.exports = app;
