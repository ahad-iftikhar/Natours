module.exports = (fn) => {
  // Global function to handle catch blocks, and get rid of try-catch in every function so the code will not repeat.
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(err));
  };
};
