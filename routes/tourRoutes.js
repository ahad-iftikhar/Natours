const express = require('express');
const {
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  // checkId,
  checkBody,
  getTourStats,
  getMonthlyPlan,
  aliasTopTours,
  getToursWithin,
  getDistances,
  uploadTourImages,
  resizeTourImages,
} = require('../controllers/tourController');

const { protect, restrictTo } = require('../controllers/authController');
const reviewRouter = require('../routes/reviewRoutes');

const router = express.Router();

// Nested routing

// POST /tours/2345643/reviews
// GET /tours/2345643/reviews
// GET /tours/2345643/reviews/8435234

// router
//   .route('/:tourId/reviews')
//   .post(protect, restrictTo('user'), createReview);

router.use('/:tourId/reviews', reviewRouter); // Actually we are mounting this route with 'reviewRouter' (as we are doing in app.js for simple routes where we mounted simple routes to their routers), so when this nested route "/tours/2345643/reviews" hits, first it will be mounted towards tourRoutes and then it will hit this line and will be mounted towards reviewRoutes.
// So now we are not using reviewControllers in tourRoutes and also we are not repeating the code as this was also in the reviewRoutes

// router.param('id', checkId);

router.route('/top-5-cheap').get(aliasTopTours, getAllTours);

router.route('/tour-stats').get(getTourStats);
router
  .route('/monthly-plan/:year')
  .get(protect, restrictTo('admin', 'lead-guide', 'guide'), getMonthlyPlan);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(getToursWithin);
// /tours-distance?distance=233&center=-40,45&unit=mi

router.route('/distances/:latlng/unit/:unit').get(getDistances);

router
  .route('/')
  // .get(getAllTours)
  .get(getAllTours)
  // .post(checkBody, createTour);
  .post(protect, restrictTo('admin', 'lead-guide'), createTour); // Implemented middleware to check if the user is loggedin or not, a kind of protecting the route from unauthorized access

router
  .route('/:id')
  .get(getTour)
  .patch(
    protect,
    restrictTo('admin', 'lead-guide'),
    uploadTourImages,
    resizeTourImages,
    updateTour,
  )
  .delete(protect, restrictTo('admin', 'lead-guide'), deleteTour); // First protecting the route to check if the user is logged in or not, then checking the role of the user if he have permission to deleteTour then the delete funtion will be performed

module.exports = router;
