const API_BASE_URL = (function () {
  if (window.API_BASE_URL) return window.API_BASE_URL.replace(/\/$/, '');
  const meta = document.querySelector('meta[name="api-base"]');
  if (meta && meta.content) return meta.content.replace(/\/$/, '');
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return location.origin + '/api';
  }
  return 'http://localhost:3000/api';
})();

const form = document.getElementById('adminSetupForm');
const messageEl = document.getElementById('message');
const submitBtn = document.getElementById('submitBtn');

// Préremplir le token depuis l’URL : inscription-admin.html?token=XXXX
const params = new URLSearchParams(location.search);
if (params.get('token')) {
  const el = document.getElementById('setupToken');
  if (el) el.value = params.get('token');
}

function showMessage(text, type) {
  if (!messageEl) {
    if (text) alert(text);
    return;
  }
  messageEl.textContent = text;
  messageEl.className = 'message' + (type ? ' ' + type : '');
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('');

  const setupToken = document.getElementById('setupToken')?.value?.trim();
  const nom = document.getElementById('nom')?.value?.trim();
  const prenom = document.getElementById('prenom')?.value?.trim();
  const email = document.getElementById('email')?.value?.trim();
  const motDePasse = document.getElementById('password')?.value;
  const confirm = document.getElementById('passwordConfirm')?.value;

  if (!setupToken || !nom || !prenom || !email || !motDePasse) {
    showMessage('Tous les champs marqués * sont obligatoires.', 'error');
    return;
  }
  if (motDePasse.length < 8) {
    showMessage('Mot de passe : minimum 8 caractères.', 'error');
    return;
  }
  if (motDePasse !== confirm) {
    showMessage('Les mots de passe ne correspondent pas.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/inscription-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ nom, prenom, email, motDePasse, setupToken }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showMessage(data.message || 'Impossible de créer le compte admin.', 'error');
      return;
    }
    showMessage('Administrateur créé. Redirection…', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  } catch (err) {
    console.error(err);
    showMessage('Serveur injoignable. Vérifiez que le backend tourne.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }
});
