const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  if (req.secure) cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;
  // Removing active field from output
  user.active = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    // This will only take this data to create user, so if user add some extra data like role which is only for admins it will be ignored.
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });

  //   const token = signToken(newUser._id);

  //   res.status(201).json({
  //     status: 'success',
  //     token,
  //     data: {
  //       user: newUser,
  //     },
  //   });

  // Sending welcome email
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exists.
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // Check if user exist && password is correct
  const user = await User.findOne({ email }).select('+password'); // As we are not sending password in the data, so here we need passwrod to verify, so we are selecting the password explicitly
  //   const correct = await user.correctPassword(password, user.password);       //correctPassword is declared in userModel

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  // If everything ok, send token to client
  //   const token = signToken(user._id);
  //   res.status(200).json({
  //     status: 'success',
  //     token,
  //   });
  createSendToken(user, 200, req, res);
};

exports.protect = catchAsync(async (req, res, next) => {
  // Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token)
    return next(
      new AppError('User is not loggedin, Login to get access!', 401),
    );

  // Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // Using 'promisify' nodejs function from 'utils' so the function will return a promise. 'jwt.verify' is a function to verify the token and is wrapped in promisify soit will return a promise and in next parenthesis we are calling that function with parameters.

  // check if user still exits
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401,
      ),
    );
  }

  // Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    // This is declared in userModel, This is an intance method so must be called on object, so we are calling it on freshUser
    return next(
      new AppError('User recently changed password!, Please login again', 401),
    );
  }

  req.user = currentUser;
  // Grant access to protected route
  res.locals.user = currentUser; // This will put the user variable in locals and it will be available in every pug template.
  next();
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    // Basically we are sending a cookie of same name to browser so it will override the current token cookie, and the user will be loggedout and this cookiw will expire after 10 seconds
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

// Only for rendered pages, no errors!, It is similar to protect function
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // Deleted catchAsync and implemented try-catch when created logout functionality in pug website bcz we just want to logout and don't want to send any error msg to our global middleware that is the user loggin or not. If an error occur in try block we are just calling next middleware in catch block
      // 1) Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      ); // Using 'promisify' nodejs function from 'utils' so the function will return a promise. 'jwt.verify' is a function to verify the token and is wrapped in promisify soit will return a promise and in next parenthesis we are calling that function with parameters.

      // 2) check if user still exits
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        // This is declared in userModel, This is an intance method so must be called on object, so we are calling it on freshUser
        return next();
      }

      // There is a logged in user
      res.locals.user = currentUser; // This will put the user variable in locals and it will be available in every pug template.
      return next();
    } catch (error) {
      return next();
    }
  }
  next(); // If there is no cookie, just call the next middleware
};

exports.restrictTo = (...roles) => {
  // We need parameters in this middleware, in normal middleware we can not have parameters, so we have wrapped a normal function that is returning the middleware function.
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      // In upper function we have set the user to the request parameter
      return next(
        new AppError('You do not have permission to perform this action.', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user exist with this email', 404));
  }

  // Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // Here we are saving the document but disabling the validators bcz we are not sending all the data as in schema, but just sending email.

  // Send to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  // const message = `Forgot your password? Submit a PATCH request with your new passwrod and passwrodConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    // await sendEmail({
    //   email: user.email, // or req.body.email
    //   subject: 'Your password reset token (valid for 10 minutes)',
    //   message,
    // });

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token send to email!',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined; // This will modify the data but not save it.
    await user.save({ validateBeforeSave: false }); // This will save the data.

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // Get user based on the token
  const hasedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hasedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired.', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save(); // Not disabled validators bcz we want to check password and passwordConfirm are same.

  // Update changePasswordAt property for the user
  // --------------Implemented a middleware so set this property in userModel

  // Log the user in, send JWT
  //   const token = signToken(user._id);
  //   res.status(200).json({
  //     status: 'success',
  //     token,
  //   });
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will not work

  // 4) Log user in, send JWT
  //   const token = signToken(user._id);
  //   res.status(200).json({
  //     status: 'success',
  //     token,
  //   });
  createSendToken(user, 200, req, res);
});
