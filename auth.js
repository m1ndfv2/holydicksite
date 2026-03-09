(function () {
  var form = document.getElementById('login-form');
  var statusEl = document.getElementById('auth-status');
  var welcomeEl = document.getElementById('auth-welcome');
  var logoutBtn = document.getElementById('logout-btn');
  var authEntryLinkEl = document.getElementById('auth-entry-link');
  var profileHelloEl = document.getElementById('profile-hello');
  var profileUsernameEl = document.getElementById('profile-username');
  var profileLoginTimeEl = document.getElementById('profile-login-time');
  var profileGuestHintEl = document.getElementById('profile-guest-hint');
  var profileListEl = document.getElementById('profile-list');

  var isAuthenticated = false;
  var userMenuWrapEl = null;
  var userMenuButtonEl = null;
  var userMenuDropdownEl = null;
  var userMenuLogoutEl = null;
  var userMenuAvatarEl = null;

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle('status-bad', Boolean(isError));
  }

  function formatLastLogin(lastLogin) {
    var ms = Number(lastLogin);
    if (!Number.isFinite(ms) || ms <= 0) return '—';

    return new Date(ms).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function closeUserMenu() {
    if (!userMenuWrapEl || !userMenuDropdownEl) return;
    userMenuWrapEl.classList.remove('open');
    userMenuDropdownEl.hidden = true;
  }

  function initUserMenu() {
    if (!authEntryLinkEl) return;
    var topLinks = authEntryLinkEl.parentElement;
    if (!topLinks) return;

    userMenuWrapEl = document.createElement('div');
    userMenuWrapEl.className = 'auth-user-menu';
    userMenuWrapEl.hidden = true;

    userMenuButtonEl = document.createElement('button');
    userMenuButtonEl.type = 'button';
    userMenuButtonEl.className = 'discord-chip auth-user-button';

    userMenuAvatarEl = document.createElement('img');
    userMenuAvatarEl.className = 'auth-user-avatar';
    userMenuAvatarEl.alt = 'Скин игрока';
    userMenuAvatarEl.width = 20;
    userMenuAvatarEl.height = 20;
    userMenuAvatarEl.hidden = true;

    var userMenuText = document.createElement('span');
    userMenuText.className = 'auth-user-name';
    userMenuText.textContent = 'Игрок';

    userMenuButtonEl.appendChild(userMenuAvatarEl);
    userMenuButtonEl.appendChild(userMenuText);

    userMenuDropdownEl = document.createElement('div');
    userMenuDropdownEl.className = 'auth-user-dropdown';
    userMenuDropdownEl.hidden = true;

    var profileLink = document.createElement('a');
    profileLink.className = 'auth-user-item';
    profileLink.href = 'profile.html';
    profileLink.textContent = 'Профиль';

    userMenuLogoutEl = document.createElement('button');
    userMenuLogoutEl.type = 'button';
    userMenuLogoutEl.className = 'auth-user-item auth-user-item-btn';
    userMenuLogoutEl.textContent = 'Выйти';

    userMenuDropdownEl.appendChild(profileLink);
    userMenuDropdownEl.appendChild(userMenuLogoutEl);
    userMenuWrapEl.appendChild(userMenuButtonEl);
    userMenuWrapEl.appendChild(userMenuDropdownEl);
    topLinks.appendChild(userMenuWrapEl);

    userMenuButtonEl.addEventListener('click', function () {
      var isOpen = userMenuWrapEl.classList.toggle('open');
      userMenuDropdownEl.hidden = !isOpen;
    });

    document.addEventListener('click', function (event) {
      if (!userMenuWrapEl || userMenuWrapEl.hidden) return;
      if (userMenuWrapEl.contains(event.target)) return;
      closeUserMenu();
    });
  }

  function updateTopRightAuth(username, skinHeadUrl) {
    if (isAuthenticated) {
      if (authEntryLinkEl) authEntryLinkEl.hidden = true;
      if (userMenuWrapEl && userMenuButtonEl) {
        var nameEl = userMenuButtonEl.querySelector('.auth-user-name');
        if (nameEl) nameEl.textContent = username;

        if (userMenuAvatarEl) {
          if (skinHeadUrl) {
            userMenuAvatarEl.src = skinHeadUrl;
            userMenuAvatarEl.hidden = false;
          } else {
            userMenuAvatarEl.removeAttribute('src');
            userMenuAvatarEl.hidden = true;
          }
        }

        userMenuWrapEl.hidden = false;
      }
      return;
    }

    if (authEntryLinkEl) {
      authEntryLinkEl.hidden = false;
      authEntryLinkEl.textContent = 'Вход';
      authEntryLinkEl.href = 'login.html';
      authEntryLinkEl.classList.remove('account-link');
    }

    if (userMenuWrapEl) {
      closeUserMenu();
      userMenuWrapEl.hidden = true;
    }
  }

  function cleanupLegacyTopbar() {
    var legacyGuest = document.getElementById('account-chip');
    if (legacyGuest) legacyGuest.remove();

    var topLinks = document.querySelector('.top-links');
    if (!topLinks) return;

    var loginLinks = topLinks.querySelectorAll('a[href="login.html"], a[href="/login.html"]');
    loginLinks.forEach(function (link) {
      if (link !== authEntryLinkEl) link.remove();
    });

    var profileLinks = topLinks.querySelectorAll('a[href="profile.html"], a[href="/profile.html"]');
    profileLinks.forEach(function (link) {
      link.remove();
    });
  }

  function showProfileState() {
    if (profileGuestHintEl) profileGuestHintEl.hidden = isAuthenticated;
    if (profileHelloEl) profileHelloEl.hidden = !isAuthenticated;
    if (profileListEl) profileListEl.hidden = !isAuthenticated;
  }

  function updateProfile(username, lastLogin) {
    if (profileHelloEl) profileHelloEl.textContent = 'Привет, ' + username + '!';
    if (profileUsernameEl) profileUsernameEl.textContent = username;
    if (profileLoginTimeEl) profileLoginTimeEl.textContent = formatLastLogin(lastLogin);
  }

  function setLoggedIn(username, lastLogin, skinHeadUrl) {
    isAuthenticated = true;

    if (welcomeEl) {
      welcomeEl.textContent = 'Вы вошли как: ' + username;
      welcomeEl.hidden = false;
    }

    if (logoutBtn) logoutBtn.hidden = false;
    if (form) form.hidden = true;

    updateTopRightAuth(username, skinHeadUrl);
    updateProfile(username, lastLogin);
    showProfileState();
  }

  function setLoggedOut() {
    isAuthenticated = false;

    if (welcomeEl) welcomeEl.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
    if (form) form.hidden = false;

    updateTopRightAuth('', null);
    showProfileState();

    if (window.location.pathname.endsWith('/profile.html') || window.location.pathname === '/profile.html') {
      setStatus('Вы не авторизованы. Войдите, чтобы увидеть данные аккаунта.', false);
    }
  }

  async function doLogout() {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (_) {}

    setLoggedOut();
    setStatus('Вы вышли из аккаунта.', false);

    setTimeout(function () {
      window.location.href = 'index.html';
    }, 250);
  }

  async function checkSession() {
    try {
      var res = await fetch('/api/session', { credentials: 'same-origin' });
      if (!res.ok) {
        setLoggedOut();
        return;
      }

      var data = await res.json();
      if (data.ok) setLoggedIn(data.username, data.lastLogin, data.skinHeadUrl);
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

        setLoggedIn(data.username, data.lastLogin, data.skinHeadUrl);
        form.reset();
        if (window.location.pathname.endsWith('/login.html') || window.location.pathname === '/login.html') {
          setTimeout(function () {
            window.location.href = 'profile.html';
          }, 350);
        }
      } catch (_) {
        setStatus('Сервер недоступен.', true);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', doLogout);
  }

  cleanupLegacyTopbar();
  initUserMenu();
  if (userMenuLogoutEl) userMenuLogoutEl.addEventListener('click', doLogout);
  updateTopRightAuth('', null);
  showProfileState();
  checkSession();
})();
