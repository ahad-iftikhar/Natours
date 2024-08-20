// const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// Multer stuff for images

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  // The purpose of this function is to check wether the uploaded file is an image or not, if it is pass true in the cb otherwise pass false in cb with the error instead of null
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// const upload = multer({ dest: 'public/img/users' });     // In start for simple and testing purposes
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// upload.single('image')    // When only one image  -- produce req.file
// upload.array('images', 3)     // In case we want only images not imageCover than it wil be done like this  -- produce req.files

exports.uploadTourImages = upload.fields([
  // produce req.files
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // 1) Cover Image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  await Promise.all(
    // If we dont do this it will not work and bcz it will not wait and move to next middleware and our images will not be saved, as map function return an array and inside map there is an async function so we are awaiting all that promises in order to code work
    req.files.images.map(async (image, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(image.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );

  next();
});

// -----------

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}../../dev-data/data/tours-simple.json`)
// );

// exports.checkId = (req, res, next, val) => {
//   console.log(`Tour id is ${val}`);
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid ID',
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'Missing name or price',
//     });
//   }
//   next();
// };

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   // req.query ---> Will give all the queries after the '?'

//   // try {

//   // CREATE QUERY

//   // FILTERING
//   // const queryObj = { ...req.query };
//   // const excludedFields = ['page', 'sort', 'limit', 'fields'];
//   // excludedFields.forEach((el) => delete queryObj[el]);

//   // // ADVANCED FILTERING

//   // let queryStr = JSON.stringify(queryObj);
//   // queryStr = queryStr.replace(/\b(gte|gt|lt|lte)\b/g, (match) => `$${match}`);

//   // // const tours = await Tour.find(queryObj);
//   // let query = Tour.find(JSON.parse(queryStr)); // We are not directly awaiting the query because we want to apply sorting, limit etc on the query and if we directly await that will not be possible, so we are storing it, applying our sorting etc and then awaiting the query.

//   // Tour                             // Another method to query data using mongoose methods
//   //   .find()
//   //     .where('duration')
//   //     .equals(5)
//   //     .where('difficulty')
//   //     .equals('easy');

//   // SORTING
//   // if (req.query.sort) {
//   //   const sortBy = req.query.sort.split(',').join(' '); // This will split multiple queries having comma between them and make a string having space between them
//   //   query = query.sort(sortBy);
//   // } else {
//   //   query = query.sort('-createdAt');
//   // }

//   // FIELDS LIMITING
//   // if (req.query.fields) {
//   //   const fields = req.query.fields.split(',').join(' ');
//   //   query = query.select(fields);
//   // } else {
//   //   query = query.select('-__v');
//   // }

//   // PAGINATION
//   // const page = req.query.page * 1 || 1;
//   // const limit = req.query.limit * 1 || 100;
//   // const skip = (page - 1) * limit; // This will calculate how many posts we have to skip before the current page

//   // query = query.skip(skip).limit(limit);

//   // if (req.query.page) {
//   //   // Handling if the current page is greator than the total number of pages
//   //   const numTours = await Tour.countDocuments();
//   //   if (skip >= numTours) throw new Error('This page doesnot exist');
//   // }

//   // EXECUTE QUERY
//   //   const features = new APIFeatures(Tour, req.query)
//   //     .filter()
//   //     .sort()
//   //     .limitFields()
//   //     .paginate();
//   //   const tours = await features.query;

//   //   // SEND RESPONSE
//   //   res.status(200).json({
//   //     status: 'success',
//   //     results: tours.length,
//   //     data: { tours },
//   //   });
//   // } catch (error) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: error,
//   //   });
//   // }

//   // Without try-catch using global catch error function
//   const features = new APIFeatures(Tour, req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   // SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     results: tours.length,
//     data: { tours },
//   });
// });

exports.getAllTours = factory.getAll(Tour);

// exports.getTour = catchAsync(async (req, res, next) => {
//   // const id = req.params.id * 1; // converting string into number by multiplying it with 1.

//   // const tour = tours.find((el) => el.id === id);

//   //   if (!tour) {
//   //     return res.status(404).json({
//   //       status: 'fail',
//   //       message: 'Invalid ID',
//   //     });
//   //   }                      // Implemented in middleware

//   // res.status(200).json({
//   //   status: 'success',
//   //   data: { tour },
//   // });

//   // Database Logic
//   // try {
//   //   const tour = await Tour.findById(req.params.id);

//   //   res.status(200).json({
//   //     status: 'success',
//   //     data: { tour },
//   //   });
//   // } catch (error) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: error,
//   //   });
//   // }

//   // Without try-catch using global catch error function
//   const tour = await Tour.findById(req.params.id).populate('reviews'); // Before advanced modeling, before adding guides in tour model

//   // const tour = await Tour.findById(req.params.id).populate({
//   //   // Here we are populating the data, means we have just stored user id's in the guides array in the database, but when we are sending the data to the user, we are actually referncing those user id's to the user objects, and sending the complete user data in the guides array. At large scale using populate has a performance effect.
//   //   path: 'guides',
//   //   select: '-__v -passwordChangedAt', // Filtering some properties that are not required to show.
//   // });

//   // Now implemented this populate function in query middleware because we want it on every find query (getTOur, getAllTours etc) in tourModel

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: { tour },
//   });
// });

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

// exports.updateTour = catchAsync(async (req, res, next) => {
//   //   if (req.params.id * 1 > tours.length) {
//   //     return res.status(404).json({
//   //       status: 'fail',
//   //       message: 'Invalid ID',
//   //     });
//   //   }

//   // Logic........
//   // res.status(200).json({
//   //   status: 'success',
//   //   message: '<Updated tour....>',
//   // });

//   // Database Logic
//   // try {
//   //   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//   //     new: true,
//   //     runValidators: true,
//   //   });

//   //   res.status(200).json({
//   //     status: 'success',
//   //     data: { tour },
//   //   });
//   // } catch (error) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: error,
//   //   });
//   // }

//   // Without try-catch using global catch error function
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   });

//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: { tour },
//   });
// });

exports.updateTour = factory.updateOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   // try {
//   //   await Tour.findByIdAndDelete(req.params.id);
//   //   res.status(204).json({
//   //     status: 'success',
//   //     message: 'Deleted successfully',
//   //     data: null,
//   //   });
//   // } catch (error) {
//   //   res.status(404).json({
//   //     status: 'fail',
//   //     message: error,
//   //   });
//   // }

//   // Without try-catch using global catch error function
//   const tour = await Tour.findByIdAndDelete(req.params.id);
//   if (!tour) {
//     return next(new AppError('No tour found with that ID', 404));
//   }
//   res.status(204).json({
//     status: 'success',
//     message: 'Deleted successfully',
//     data: null,
//   });
// });

exports.deleteTour = factory.deleteOne(Tour); // Implemented a generalized delete function to delete tour, user, review or any document, we just have to pass the model.

// const catchAsync = (fn) => {               // Global function to handle catch blocks, and get rid of try-catch in every function so the code will not repeat.
//   return (req, res, next) => {
//     fn(req, res, next).catch((err) => next(err));
//   };
// };

// exports.createTour = catchAsync(async (req, res, next) => {        // Method to get rid of try,catch block. We made a global function "catchAsync" and wrapped the function in it. The function in it is the argument of of catchAsync function and in catchAsync function we are calling the argument function. In catchAsync function we are returning an anonymous function that will be called when the route hits.
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({
//     message: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

// exports.createTour = catchAsync(async (req, res) => {
//   // const newId = tours[tours.length - 1].id + 1;
//   // const newTour = Object.assign({ id: newId }, req.body);

//   // tours.push(newTour);

//   // fs.writeFile(
//   //   `${__dirname}../../dev-data/data/tours-simple.json`,
//   //   JSON.stringify(tours),
//   //   (err) => {
//   //     res.status(201).json({
//   //       message: 'success',
//   //       data: {
//   //         tour: newTour,
//   //       },
//   //     });
//   //   },
//   // );

//   // Database Code
//   // try {

//   // const newTour = new Tour({});          // 1st method
//   // newTour.save();

//   //   const newTour = await Tour.create(req.body); // 2nd method

//   //   res.status(201).json({
//   //     message: 'success',
//   //     data: {
//   //       tour: newTour,
//   //     },
//   //   });
//   // } catch (error) {
//   //   res.status(400).json({
//   //     status: 'fail',
//   //     message: error,
//   //   });
//   // }

//   // Without try-catch using global catch error function
//   const newTour = await Tour.create(req.body);

//   res.status(201).json({
//     message: 'success',
//     data: {
//       tour: newTour,
//     },
//   });
// });

exports.createTour = factory.createOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  // try {
  //   const stats = await Tour.aggregate([
  //     {
  //       $match: { ratingsAverage: { $gte: 4.5 } },
  //     },
  //     {
  //       $group: {
  //         _id: { $toUpper: '$difficulty' },
  //         numTours: { $sum: 1 },
  //         numRatings: { $sum: '$ratingsQuantity' },
  //         avgRatings: { $avg: '$ratingsAverage' },
  //         avgPrice: { $avg: '$price' },
  //         minPrice: { $min: '$price' },
  //         maxPrice: { $max: '$price' },
  //       },
  //     },
  //     {
  //       $sort: { avgPrice: 1 },
  //     },
  //     // {
  //     //   $match: { _id: { $ne: 'EASY' } },
  //     // },
  //   ]);
  //   res.status(201).json({
  //     message: 'success',
  //     data: { stats },
  //   });
  // } catch (error) {
  //   res.status(400).json({
  //     status: 'fail',
  //     message: error,
  //   });
  // }

  // Without try-catch using global catch error function
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRatings: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);
  res.status(201).json({
    message: 'success',
    data: { stats },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res) => {
  // try {
  //   const year = req.params.year;
  //   const plan = await Tour.aggregate([
  //     {
  //       $unwind: '$startDates',
  //     },
  //     {
  //       $match: {
  //         startDates: {
  //           $gte: new Date(`${year}-01-01`),
  //           $lte: new Date(`${year}-12-31`),
  //         },
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: { $month: '$startDates' },
  //         numTourStarts: { $sum: 1 },
  //         tours: { $push: '$name' },
  //       },
  //     },
  //     {
  //       $sort: { numTourStarts: -1 },
  //     },
  //     {
  //       $addFields: { month: '$_id' },
  //     },
  //     {
  //       $project: { _id: 0 },
  //     },
  //     {
  //       $limit: 12,
  //     },
  //   ]);

  //   res.status(201).json({
  //     message: 'success',
  //     data: { plan },
  //   });
  // } catch (error) {
  //   res.status(400).json({
  //     status: 'fail',
  //     message: error,
  //   });
  // }

  // Without try-catch using global catch error function
  const year = req.params.year;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(201).json({
    message: 'success',
    data: { plan },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // dividing by radius of earth in miles or km's

  if (!lat || !lng) {
    new AppError(
      'Please provide latitude and longitude in the format lat,lng.',
      400,
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    new AppError(
      'Please provide latitude and longitude in the format lat,lng.',
      400,
    );
  }

  const distances = Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'Field',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        // This will select specific fields from the data
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
