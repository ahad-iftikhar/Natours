const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name',
  //   }).populate({
  //     path: 'user',
  //     select: 'name photo',
  //   });

  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // This is a static method and it is called on a Model,
  const stats = await this.aggregate([
    // aggregate must be called on a Model so "this" will point to current model
    {
      $match: { tour: tourId }, // This will select all the reviews that will belong to the tour we are specifying
    },
    {
      $group: {
        _id: '$tour', // We have to specify a common field in all the reviews, in this case is the tour
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }, // we are calculating avg on rating field in the model
      },
    },
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

// We are using post middleware bcz we will calculate the stats when review is stored in DB.
reviewSchema.post('save', function () {
  // Will be called whenever the new review is created

  // this points to current review
  this.constructor.calcAverageRatings(this.tour);

  //   Review.calcAverageRatings(this.tour);     This will be called like this, but we do not have access to Review bcz Review is created after this middleware, so we are using "this.constructor" which will point to the Review.
});

// Calculating AverageRatings when review is updated or deleted.
// In query middlewares 'this' points to the current query.

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne(); // We are getting the document that is updated or deleted, and passing that object to next middleware using 'this.r' as it will set that object as an 'r' property in 'this'
  next();
});

// post middlewares does not have next function
reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does not work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour); // 'this.r' is the document that was passed by previous middleware, and .constructor will point to the Model on which we are calling our 'calcAverageRatings' function and passing the tour id as parameter from 'this.r' as our review contains tour and user id for parent referencing
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
