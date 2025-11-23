async function loadCurrentUser() {
  try {
    const res = await fetch(`${API_URL}/auth/user`, {
      headers: getAuthHeader(),
    });
    if (res.ok) {
      currentUser = await res.json();
      document.getElementById('username-display').textContent =
        currentUser.username;
      document.getElementById('login-modal').classList.remove('open');
    } else {
      logout();
    }
  } catch (err) {
    console.error('Failed to load user:', err);
    logout();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      currentToken = data.token;
      currentUser = { id: data.userId, username: data.username };
      localStorage.setItem('auth_token', data.token);
      document.getElementById('username-display').textContent = data.username;
      document.getElementById('login-modal').classList.remove('open');
      loadServices();
    } else {
      document.getElementById('login-error').textContent =
        'Invalid username or password';
    }
  } catch (err) {
    document.getElementById('login-error').textContent = 'Login failed';
    console.error('Login error:', err);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById(
    'register-password-confirm'
  ).value;

  if (password !== passwordConfirm) {
    document.getElementById('register-error').textContent =
      'Passwords do not match';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      currentToken = data.token;
      currentUser = { id: data.userId, username: data.username };
      localStorage.setItem('auth_token', data.token);
      document.getElementById('username-display').textContent = data.username;
      document.getElementById('register-modal').classList.remove('open');
      loadServices();
    } else {
      const error = await res.json();
      document.getElementById('register-error').textContent =
        error.error || 'Registration failed';
    }
  } catch (err) {
    document.getElementById('register-error').textContent =
      'Registration failed';
    console.error('Registration error:', err);
  }
}
