const express = require('express');
const {
  getAllReviews,
  createReview,
  deleteReview,
  updateReview,
  setTourUserIds,
  getReview,
} = require('../controllers/reviewController');
const { protect, restrictTo } = require('../controllers/authController');

// const router = express.Router();
const router = express.Router({ mergeParams: true }); // As we are mounting nested routes so we need tourId here but that is only available in tourRoutes, so that's why we are merging the parameters, so now we will have the tourId here

// /reviews
// /tours/2345643/reviews
// Both will hit the below route

router.use(protect);

router
  .route('/')
  .get(getAllReviews)
  .post(restrictTo('user'), setTourUserIds, createReview);

router
  .route('/:id')
  .get(getReview)
  .patch(restrictTo('user', 'admin'), updateReview)
  .delete(restrictTo('user', 'admin'), deleteReview);

module.exports = router;
