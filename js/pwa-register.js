/**
 * Enregistrement PWA + mise à jour automatique
 * - vérifie une nouvelle version au démarrage et toutes les 30 min
 * - active le nouveau SW immédiatement
 * - recharge l'app une seule fois quand le nouveau SW prend le contrôle
 * - affiche une petite bannière "Nouvelle version"
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var reloading = false;

  function showUpdateBanner(onConfirm) {
    if (document.getElementById('pwa-update-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'pwa-update-banner';
    bar.setAttribute('role', 'status');
    bar.style.cssText =
      'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;' +
      'background:#111;color:#fff;padding:12px 16px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.25);' +
      'display:flex;gap:12px;align-items:center;font:500 14px/1.3 system-ui,sans-serif;max-width:92vw';
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
      bar.remove();
    };
  }

  function activateWaiting(reg) {
    if (reg.waiting) {
      reg.waiting.postMessage('SKIP_WAITING');
    }
  }

  function trackInstalling(reg) {
    var nw = reg.installing;
    if (!nw) return;
    nw.addEventListener('statechange', function () {
      if (nw.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // Nouvelle version en attente
          showUpdateBanner(function () {
            activateWaiting(reg);
            // le reload se fait sur controllerchange
          });
          // Auto-activation après 1s (mise à jour quasi automatique)
          setTimeout(function () {
            activateWaiting(reg);
          }, 1000);
        }
      }
    });
  }

  // Quand le nouveau SW prend le contrôle → recharger une fois
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('./sw.js')
      .then(function (reg) {
        console.log('[PWA] SW enregistré', reg.scope);

        if (reg.waiting) {
          showUpdateBanner(function () {
            activateWaiting(reg);
          });
          setTimeout(function () {
            activateWaiting(reg);
          }, 1000);
        }

        reg.addEventListener('updatefound', function () {
          trackInstalling(reg);
        });

        // Vérification périodique (app installée incluse)
        setInterval(function () {
          reg.update().catch(function () {});
        }, 30 * 60 * 1000);

        // Vérifier à chaque retour sur l'app (mobile / PWA)
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible') {
            reg.update().catch(function () {});
          }
        });
      })
      .catch(function (err) {
        console.warn('[PWA] SW échec', err);
      });
  });
})();
