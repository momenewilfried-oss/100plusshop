const API_BASE_URL = (function () {
  if (window.API_BASE_URL) return window.API_BASE_URL.replace(/\/$/, '');
  const meta = document.querySelector('meta[name="api-base"]');
  if (meta && meta.content) return meta.content.replace(/\/$/, '');
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return location.origin + '/api';
  }
  return 'https://100plusshop-backend-pied.vercel.app/api';
})();
const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
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

// Icônes "œil" (mot de passe masqué, clic pour afficher) et "œil barré" (mot de passe visible, clic pour masquer)
const EYE_OPEN = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

if (togglePasswordBtn && passwordInput) {
  const eyeIcon = togglePasswordBtn.querySelector('svg');
  togglePasswordBtn.addEventListener('click', () => {
    const estVisible = passwordInput.type === 'text';
    passwordInput.type = estVisible ? 'password' : 'text';
    togglePasswordBtn.setAttribute('aria-pressed', String(!estVisible));
    togglePasswordBtn.setAttribute('aria-label', estVisible ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
    if (eyeIcon) eyeIcon.innerHTML = estVisible ? EYE_OPEN : EYE_OFF;
  });
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('');

  const email = emailInput?.value?.trim();
  const motDePasse = passwordInput?.value;

  if (!email || !motDePasse) {
    showMessage('Email et mot de passe requis.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/connexion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        motDePasse,
        remember: !!rememberCheckbox?.checked,
        resterConnecte: !!rememberCheckbox?.checked,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showMessage(data.message || 'Identifiants incorrects.', 'error');
      return;
    }

    const remember = rememberCheckbox?.checked;
    if (data.token) {
      if (remember) {
        localStorage.setItem('100plusshop_token', data.token);
        sessionStorage.removeItem('100plusshop_token');
      } else {
        sessionStorage.setItem('100plusshop_token', data.token);
        localStorage.removeItem('100plusshop_token');
      }
      localStorage.setItem('100plusshop_user', JSON.stringify(data.utilisateur || {}));
      if (remember) {
        localStorage.setItem('100plusshop_remember', '1');
      } else {
        localStorage.removeItem('100plusshop_remember');
      }
    }

    showMessage('Connexion réussie !', 'success');
    setTimeout(() => {
      window.location.href = 'app.html';
    }, 400);
  } catch (err) {
    console.error(err);
    showMessage(
      'Impossible de joindre le serveur. Veuillez vérifier votre connexion internet',
      'error'
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }
});