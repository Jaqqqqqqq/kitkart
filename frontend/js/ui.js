// Simple global popup/toast helper
(function () {
  function ensureToast() {
    let t = document.getElementById('globalToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'globalToast';
      t.className = 'msg-toast';
      t.style.display = 'none';
      document.body.appendChild(t);
    }
    return t;
  }

  window.showPopup = function (message, type) {
    const t = ensureToast();
    t.textContent = message || '';
    t.style.display = 'block';
    t.style.background = type === 'error' ? '#fee2e2' : (type === 'success' ? '#dcfce7' : '#e2e8f0');
    t.style.color = type === 'error' ? '#7f1d1d' : '#042c1f';
    clearTimeout(window._globalToastTimer);
    window._globalToastTimer = setTimeout(() => { t.style.display = 'none'; }, 3500);
  };
})();
