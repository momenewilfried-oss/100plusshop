const API_BASE_URL = (function () {
  if (window.API_BASE_URL) return window.API_BASE_URL.replace(/\/$/, '');
  const meta = document.querySelector('meta[name="api-base"]');
  if (meta && meta.content) return meta.content.replace(/\/$/, '');
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return location.origin + '/api';
  }
  return 'http://localhost:3000/api';
})();

const form = document.getElementById('registerForm');
const nomInput = document.getElementById('nom');
const prenomInput = document.getElementById('prenom');
const emailInput = document.getElementById('email');
const telephoneInput = document.getElementById('telephone');
const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('passwordConfirm');
const messageEl = document.getElementById('message');
const submitBtn = document.querySelector('.login-btn') || document.getElementById('submitBtn');
const togglePasswordBtn = document.getElementById('togglePassword');

// Déjà connecté → app
if (localStorage.getItem('100plusshop_token') || sessionStorage.getItem('100plusshop_token')) {
  window.location.href = 'app.html';
}

function showMessage(text, type) {
  if (!messageEl) {
    if (text) alert(text);
    return;
  }
  messageEl.textContent = text;
  messageEl.className = 'message' + (type ? ' ' + type : '');
}

togglePasswordBtn?.addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('');

  const nom = nomInput?.value?.trim();
  const prenom = prenomInput?.value?.trim();
  const email = emailInput?.value?.trim();
  const telephone = telephoneInput?.value?.trim();
  const motDePasse = passwordInput?.value;
  const motDePasseConfirm = passwordConfirmInput?.value;

  if (!nom || !prenom || !email || !motDePasse) {
    showMessage('Merci de remplir tous les champs obligatoires.', 'error');
    return;
  }

  if (motDePasse.length < 8) {
    showMessage('Le mot de passe doit contenir au moins 8 caractères.', 'error');
    return;
  }

  if (motDePasse !== motDePasseConfirm) {
    showMessage('Les mots de passe ne correspondent pas.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/inscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        nom,
        prenom,
        email,
        telephone: telephone || undefined,
        motDePasse,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showMessage(data.message || 'Impossible de créer le compte.', 'error');
      return;
    }

    showMessage('Compte créé avec succès ! Redirection vers la connexion…', 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  } catch (err) {
    console.error(err);
    showMessage(
      'Impossible de joindre le serveur. Vérifiez que le backend tourne sur http://localhost:3000',
      'error'
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }
});