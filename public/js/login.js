// DOM ELEMENTS
const logoutBtn = document.querySelector('.nav__el--logout');
const loginForm = document.querySelector('.form--login');

const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      // url: 'http://localhost:3000/api/v1/users/login',         // Developement Url
      url: '/api/v1/users/login', // This url will work only when the API and website will be hosted to same server.
      data: {
        email,
        password,
      },
    });
    if (res.data.status === 'success') {
      alert('Logged in successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 500);
    }
  } catch (error) {
    alert(error.response.data.message);
  }
};
if (loginForm)
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });

const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });

    if (res.data.status === 'success') location.reload(true);
  } catch (error) {
    alert('Error Logging out. Try again!');
  }
};

if (logoutBtn) logoutBtn.addEventListener('click', logout);
