const mongoose = require('mongoose');
const { default: slugify } = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      minlength: [
        // Validator
        10,
        'A tour name must have more or equal then 10 characters.',
      ],
      maxlength: [
        40,
        'A tour name must have less or equal then 40 characters.',
      ],
      //   validate: [validator.isAlpha, 'Tour name must contain only characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        // Validator
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty can be: easy, medium or difficult',
      },
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // custom validator, Will return true when the condition will be true otherwise false
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1.0, 'Rating must be more or equal to 1.0'], // Validator
      max: [5.0, 'Rating must be less or equal to 5.0'],
      set: (val) => Math.round(val * 10) / 10, // 4.666666, 46.6666, 47, 4.7   // Math.round convert into integers that's why we are doing this    // It is a setter finction and will run whenever the value changes
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // This will hide this field in the output for the user
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }], // Specify the type that, it will be a Object Id of other document and giving the ref reference of that Object which is "user"
  },
  {
    toJSON: { virtuals: true }, // For virtual properties
    toObject: { virtuals: true },
  },
);

tourSchema.virtual('durationWeeks').get(function () {
  // Virtual properties that are not added to database but are added to our data using calculatins on other properties
  return this.duration / 7;
});

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// tourSchema.index({price: 1}) // SImple indexing
tourSchema.index({ price: 1, ratingsAverage: -1 }); // Compound indexing, Basically creating indexes in MongoDB so when we get data using query strings it does not have to look all the data, but will get the exact data we want, this is for performance optimization.
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // For geospatial data

// Document Middleware: runs before .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre('save', function (next) {          // This is for Embedded data. Means Complete data in other fields
//   // This will change the user(guides) id's in th guides array with the actual users(guides).
//   const guidePromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = Promise.all(guidePromises);
//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// tourSchema.post('save', function (doc, next) {
//   console.log(doc); // Will give currently processed document
//   next();
// });

// Query Middleware

// tourSchema.pre('find', function (next) {
tourSchema.pre(/^find/, function (next) {
  // Will match with all starting with find like findOne, findById etc
  this.find({ secretTour: { $ne: true } });
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    // Here we are populating the data, means we have just stored user id's in the guides array in the database, but when we are sending the data to the user, we are actually referncing those user id's to the user objects, and sending the complete user data in the guides array. At large scale using populate has a performance effect.
    path: 'guides',
    select: '-__v -passwordChangedAt', // Filtering some properties that are not required to show.
  });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(docs);
// });

// Aggregation Middleware

// commented when implemented the last funtion for tours in tourModel named 'getDistances' bcz we want 'geoNear' at first position in the aggregation pipeline but this 'match' was the first one so we commented it.
// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); // this.pipeline will give all the aggregate pipeline like we defined in getTourStats function in tourController file. And then we are adding another match property in the start of the aggregate pipeline that will filter out according to secret tour.
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
