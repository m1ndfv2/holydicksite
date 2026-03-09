(function () {
  var storageKey = 'holyduck-theme';
  var root = document.documentElement;

  function getPreferredTheme() {
    var saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.textContent = theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему');
    });
  }

  function toggleTheme() {
    var current = root.getAttribute('data-theme') || getPreferredTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getPreferredTheme());
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
  });
})();
