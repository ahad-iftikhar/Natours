const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/bookingModel');
const Tour = require('../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    // success_url: `${req.protocol}://${req.get('host')}/`, // When payment get success user will redirected to this route
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`, // Here we are passing the data to the route in the query string bcz we want to create a booking in database, so we want data for that purpose. We are accessing this data in createBookingCheckout function below.
    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`, // When payment get failed user will redirected to this route
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      // Item details, in this case tour
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
          unit_amount: tour.price * 100, // amount in cents
        },
        quantity: 1,
      },
    ],
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is a middleware function and we are using it in viewRoutes
  // This is only TEMPORARY, because it's UNSECURE: everyone can make booking without paying
  const { tour, user, price } = req.query;

  if (!tour && !user && !price) {
    return next();
  }

  await Booking.create({ tour, user, price }); // Creating a booking in our database.

  // Here we have successfully created a booking, and now we don't need data that is in the url because it is unsecure to put data in url so we are redirecting the user to home page and remving the data in the url.
  res.redirect(req.originalUrl.split('?')[0]); // Redirecting the user to home page, bcz the original url contain data in query strings so we are removing it. You can see the url "success_url" in session of the stripe.
  next();
});

// CRUD functions for API
exports.getAllBookings = factory.getAll(Booking);

exports.getBooking = factory.getOne(Booking);

exports.createBooking = factory.createOne(Booking);

exports.updateBooking = factory.updateOne(Booking);

exports.deleteBooking = factory.deleteOne(Booking);
