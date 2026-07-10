// Simple global popup/toast helper
(function () {
  function ensureToast() {
    let t = document.getElementById('globalToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'globalToast';
      t.className = 'msg-toast';
      t.style.position = 'fixed';
      t.style.right = '16px';
      t.style.bottom = '16px';
      t.style.padding = '10px 14px';
      t.style.borderRadius = '6px';
      t.style.boxShadow = '0 6px 18px rgba(15,23,42,0.12)';
      t.style.zIndex = 9999;
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
