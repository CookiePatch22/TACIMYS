function switchToRegister() {
  document.getElementById('login-modal').classList.remove('open');
  document.getElementById('register-modal').classList.add('open');
  document.getElementById('register-error').textContent = '';
  document.getElementById('register-username').value = '';
  document.getElementById('register-password').value = '';
  document.getElementById('register-password-confirm').value = '';
}

function switchToLogin() {
  document.getElementById('register-modal').classList.remove('open');
  document.getElementById('login-modal').classList.add('open');
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function showLoginModal() {
  document.getElementById('login-modal').classList.add('open');
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function updateAuthFields() {
  const authType = document.getElementById('auth-type').value;
  document.getElementById('bearer-fields').style.display =
    authType === 'bearer' ? 'block' : 'none';
  document.getElementById('basic-fields').style.display =
    authType === 'basic' ? 'block' : 'none';
  document.getElementById('header-fields').style.display =
    authType === 'header' ? 'block' : 'none';
}
