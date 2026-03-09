(function () {
  var form = document.getElementById('login-form');
  var statusEl = document.getElementById('auth-status');
  var welcomeEl = document.getElementById('auth-welcome');
  var logoutBtn = document.getElementById('logout-btn');

  if (!form || !statusEl || !welcomeEl || !logoutBtn) return;

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle('status-bad', Boolean(isError));
  }

  function setLoggedIn(username) {
    welcomeEl.textContent = 'Вы вошли как: ' + username;
    welcomeEl.hidden = false;
    logoutBtn.hidden = false;
    form.hidden = true;
    setStatus('Авторизация успешна.', false);
  }

  function setLoggedOut() {
    welcomeEl.hidden = true;
    logoutBtn.hidden = true;
    form.hidden = false;
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
    setStatus('Вы вышли из аккаунта.', false);
  });

  checkSession();
})();
