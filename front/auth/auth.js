function getAuthHeader() {
  return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
}

function checkAuth() {
  const token = localStorage.getItem('auth_token');
  if (token) {
    currentToken = token;
    loadCurrentUser();
  } else {
    showLoginModal();
  }
}

function logout() {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem('auth_token');
  document.getElementById('username-display').textContent = '';
  showLoginModal();
}
