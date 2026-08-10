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
      'Impossible de joindre le serveur. ',
      'error'
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }
  const togglePasswordBtn = document.getElementById('togglePassword');
togglePasswordBtn?.addEventListener('click', () => {
  if (!passwordInput) return;
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
});
});