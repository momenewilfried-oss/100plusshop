/**
 * À coller dans les handlers d'enregistrement (POS, produits, etc.)
 * Empêche de cliquer 2 fois sur le même bouton.
 */
function withOnce(btn, asyncFn) {
  return async function (e) {
    if (btn.dataset.busy === '1') return;
    btn.dataset.busy = '1';
    btn.disabled = true;
    try {
      await asyncFn(e);
    } finally {
      setTimeout(() => {
        btn.dataset.busy = '0';
        btn.disabled = false;
      }, 1500);
    }
  };
}
// Exemple:
// document.getElementById('btnPayer').addEventListener('click', withOnce(btn, async () => { ... }));
