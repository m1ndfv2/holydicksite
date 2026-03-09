(function () {
  var form = document.getElementById('login-form');
  var statusEl = document.getElementById('auth-status');
  var welcomeEl = document.getElementById('auth-welcome');
  var logoutBtn = document.getElementById('logout-btn');
  var accountChipNameEl = document.getElementById('account-chip-name');
  var profileHelloEl = document.getElementById('profile-hello');
  var profileUsernameEl = document.getElementById('profile-username');
  var profileLoginTimeEl = document.getElementById('profile-login-time');
  var profileGuestHintEl = document.getElementById('profile-guest-hint');
  var profileListEl = document.getElementById('profile-list');

  var isAuthenticated = false;

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle('status-bad', Boolean(isError));
  }

  function getDateTimeLabel() {
    return new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function showProfileState() {
    if (profileGuestHintEl) profileGuestHintEl.hidden = isAuthenticated;
    if (profileHelloEl) profileHelloEl.hidden = !isAuthenticated;
    if (profileListEl) profileListEl.hidden = !isAuthenticated;
  }

  function updateAccountUi(username) {
    if (accountChipNameEl) accountChipNameEl.textContent = username || 'Гость';

    if (profileHelloEl) profileHelloEl.textContent = 'Привет, ' + username + '!';
    if (profileUsernameEl) profileUsernameEl.textContent = username;
    if (profileLoginTimeEl) profileLoginTimeEl.textContent = getDateTimeLabel();
  }

  function setLoggedIn(username) {
    isAuthenticated = true;

    if (welcomeEl) {
      welcomeEl.textContent = 'Вы вошли как: ' + username;
      welcomeEl.hidden = false;
    }

    if (logoutBtn) logoutBtn.hidden = false;
    if (form) form.hidden = true;

    updateAccountUi(username);
    showProfileState();
    setStatus('Авторизация успешна.', false);
  }

  function setLoggedOut() {
    isAuthenticated = false;

    if (welcomeEl) welcomeEl.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
    if (form) form.hidden = false;

    updateAccountUi('Гость');
    showProfileState();

    if (window.location.pathname.endsWith('/profile.html') || window.location.pathname === '/profile.html') {
      setStatus('Вы гость. Войдите, чтобы увидеть данные аккаунта.', false);
    }
  }

  async function checkSession() {
    try {
      var res = await fetch('/api/session', { credentials: 'same-origin' });
      if (!res.ok) {
        setLoggedOut();
        return;
      }

      var data = await res.json();
      if (data.ok) {
        setLoggedIn(data.username);
      }
    } catch (_) {
      setStatus('Не удалось проверить сессию.', true);
    }
  }

  if (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var formData = new FormData(form);
      var username = String(formData.get('username') || '').trim();
      var password = String(formData.get('password') || '');

      if (!username || !password) {
        setStatus('Введите логин и пароль.', true);
        return;
      }

      try {
        var res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ username: username, password: password })
        });
        var data = await res.json();

        if (!res.ok || !data.ok) {
          setStatus(data.message || 'Ошибка входа.', true);
          return;
        }

        setLoggedIn(data.username);
        form.reset();
        if (window.location.pathname.endsWith('/login.html') || window.location.pathname === '/login.html') {
          setTimeout(function () {
            window.location.href = 'profile.html';
          }, 600);
        }
      } catch (_) {
        setStatus('Сервер недоступен.', true);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      try {
        await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
      } catch (_) {}

      setLoggedOut();
      setStatus('Вы вышли из аккаунта.', false);
    });
  }

  showProfileState();
  checkSession();
})();
