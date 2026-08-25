/**
 * PWA — enregistrement stable, sans spam de bandeau
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var reloading = false;
  var DISMISS_KEY = 'pwa_update_dismissed_until';

  function isDismissed() {
    try {
      var until = Number(sessionStorage.getItem(DISMISS_KEY) || 0);
      return Date.now() < until;
    } catch (_) {
      return false;
    }
  }

  function dismissForSession() {
    try {
      sessionStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + 6 * 60 * 60 * 1000)
      );
    } catch (_) {}
  }

  function showUpdateBanner(onConfirm) {
    if (document.getElementById('pwa-update-banner')) return;
    if (isDismissed()) return;

    var bar = document.createElement('div');
    bar.id = 'pwa-update-banner';
    bar.setAttribute('role', 'status');
    bar.style.cssText =
      'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;' +
      'background:#111;color:#fff;padding:12px 16px;border-radius:10px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.25);display:flex;gap:12px;align-items:center;' +
      'font:500 14px/1.3 system-ui,sans-serif;max-width:92vw';
    bar.innerHTML =
      '<span>Nouvelle version disponible</span>' +
      '<button type="button" id="pwa-update-btn" style="background:#FF2D7B;color:#fff;border:0;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer">Actualiser</button>' +
      '<button type="button" id="pwa-update-later" style="background:transparent;color:#ccc;border:0;cursor:pointer">Plus tard</button>';
    document.body.appendChild(bar);

    document.getElementById('pwa-update-btn').onclick = function () {
      bar.remove();
      onConfirm();
    };
    document.getElementById('pwa-update-later').onclick = function () {
      dismissForSession();
      bar.remove();
    };
  }

  function activateWaiting(reg) {
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then(function (reg) {
        console.log('[PWA] SW enregistré', reg.scope);

        if (reg.waiting && navigator.serviceWorker.controller) {
          showUpdateBanner(function () {
            activateWaiting(reg);
          });
        }

        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner(function () {
                activateWaiting(reg);
              });
            }
          });
        });

        reg.update().catch(function () {});
      })
      .catch(function (err) {
        console.warn('[PWA] SW échec', err);
      });
  });
})();