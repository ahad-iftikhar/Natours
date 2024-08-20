const express = require('express');
const { protect, restrictTo } = require('../controllers/authController');
const {
  getCheckoutSession,
  getAllBookings,
  createBooking,
  getBooking,
  updateBooking,
  deleteBooking,
} = require('../controllers/bookingController');

const router = express.Router();

router.use(protect);

// Views routes, for pug website
router.get('/checkout-session/:tourId', protect, getCheckoutSession);

// API routes

router.use(restrictTo('admin', 'lead-guide'));

router.route('/').get(protect, getAllBookings).post(protect, createBooking);
router
  .route('/:id')
  .get(protect, getBooking)
  .patch(protect, updateBooking)
  .delete(protect, deleteBooking);

module.exports = router;
