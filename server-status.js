(function () {
  var endpoint = 'https://api.mcsrvstat.us/3/65.21.84.139:33069';
  var onlineEl = document.getElementById('server-online-count');
  var maxEl = document.getElementById('server-online-max');
  var statusEl = document.getElementById('server-online-status');

  if (!onlineEl || !maxEl || !statusEl) return;

  function setStatus(text, bad) {
    statusEl.textContent = text;
    statusEl.classList.toggle('status-bad', Boolean(bad));
  }

  async function loadStatus() {
    setStatus('Обновление онлайна...', false);

    try {
      var res = await fetch(endpoint, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      if (!data.online) {
        onlineEl.textContent = '0';
        maxEl.textContent = '0';
        setStatus('Сервер офлайн', true);
        return;
      }

      var players = data.players || {};
      onlineEl.textContent = String(players.online ?? 0);
      maxEl.textContent = String(players.max ?? 0);
      setStatus('Сервер онлайн', false);
    } catch (err) {
      setStatus('Не удалось получить данные', true);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadStatus();
    setInterval(loadStatus, 30000);
  });
})();
