const bookBtn = document.getElementById('book-tour');

const stripe = Stripe(
  'pk_test_51PlqLz080955psUhaoL7MUiz3CJSzu4OsPwQ2fyhXIlQD8dbKdfyQVIYgbImZ73IsDdUuW7esssZiVtsMghrA3P2008MOtNqKv',
);

const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      // `http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`,
      `/api/v1/bookings/checkout-session/${tourId}`,
    );

    // 2) Create chekout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (error) {
    console.log(error);
    alert('Error', error);
  }
};

if (bookBtn)
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    const { tourId } = e.target.dataset; // Whenever there is a '-' in data we are defining in pug template to get in JS file that dash '-' will be converted to camel case. In this case we defined 'tour-id' in pug template so it converted to tourId and we are destructuring it from dataset.
    bookTour(tourId);
  });
