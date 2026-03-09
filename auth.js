(function () {
  var form = document.getElementById('login-form');
  var statusEl = document.getElementById('auth-status');
  var welcomeEl = document.getElementById('auth-welcome');
  var logoutBtn = document.getElementById('logout-btn');
  var accountChipEl = document.getElementById('account-chip');
  var accountChipNameEl = document.getElementById('account-chip-name');
  var profileHelloEl = document.getElementById('profile-hello');
  var profileUsernameEl = document.getElementById('profile-username');
  var profileLoginTimeEl = document.getElementById('profile-login-time');
  var profileGuestHintEl = document.getElementById('profile-guest-hint');
  var profileListEl = document.getElementById('profile-list');
  var tabButtons = document.querySelectorAll('[data-auth-tab]');
  var tabPanels = document.querySelectorAll('[data-tab-panel]');

  if (!form || !statusEl || !welcomeEl || !logoutBtn) return;

  var isAuthenticated = false;

  function setStatus(message, isError) {
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

  function setActiveTab(tabName) {
    tabButtons.forEach(function (button) {
      var isActive = button.getAttribute('data-auth-tab') === tabName;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });

    tabPanels.forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-tab-panel') !== tabName;
    });
  }

  function showProfileState() {
    if (profileGuestHintEl) profileGuestHintEl.hidden = isAuthenticated;
    if (profileHelloEl) profileHelloEl.hidden = !isAuthenticated;
    if (profileListEl) profileListEl.hidden = !isAuthenticated;
  }

  function updateAccountUi(username) {
    if (accountChipEl && accountChipNameEl) {
      accountChipNameEl.textContent = username;
      accountChipEl.hidden = false;
    }

    if (profileHelloEl) profileHelloEl.textContent = 'Привет, ' + username + '!';
    if (profileUsernameEl) profileUsernameEl.textContent = username;
    if (profileLoginTimeEl) profileLoginTimeEl.textContent = getDateTimeLabel();
  }

  function clearAccountUi() {
    if (accountChipEl) accountChipEl.hidden = true;
  }

  function setLoggedIn(username) {
    isAuthenticated = true;
    welcomeEl.textContent = 'Вы вошли как: ' + username;
    welcomeEl.hidden = false;
    logoutBtn.hidden = false;
    form.hidden = true;
    updateAccountUi(username);
    showProfileState();
    setStatus('Авторизация успешна.', false);
  }

  function setLoggedOut() {
    isAuthenticated = false;
    welcomeEl.hidden = true;
    logoutBtn.hidden = true;
    form.hidden = false;
    clearAccountUi();
    showProfileState();
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
      setActiveTab('profile');
      form.reset();
    } catch (_) {
      setStatus('Сервер недоступен.', true);
    }
  });

  logoutBtn.addEventListener('click', async function () {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (_) {}

    setLoggedOut();
    setActiveTab('login');
    setStatus('Вы вышли из аккаунта.', false);
  });

  tabButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setActiveTab(button.getAttribute('data-auth-tab'));
    });
  });

  setActiveTab('login');
  showProfileState();
  checkSession();
})();
