/**
 * 100PLUSSHOP — Client API
 * Base URL configurable
 */
// Configurable : window.API_BASE_URL, meta[name=api-base], ou fallback localhost
const API_BASE = (function () {
  if (window.API_BASE_URL) return window.API_BASE_URL.replace(/\/$/, '');
  const meta = document.querySelector('meta[name="api-base"]');
  if (meta && meta.content) return meta.content.replace(/\/$/, '');
  // Même origine + /api (déploiement derrière reverse-proxy)
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return location.origin + '/api';
  }
  return 'https://100plusshop-backend-pied.vercel.app';;
})();

/**
 * Formate un montant en Francs CFA (XOF/XAF).
 * Le FCFA n'a pas de sous-unité utilisée en pratique : pas de décimales.
 * Ex: formatMontant(45000) -> "45 000 FCFA"
 */
function formatMontant(valeur) {
  const nombre = Number(valeur || 0);
  return nombre.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA';
}

/** Échappe le HTML pour éviter les XSS lors des injections innerHTML */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Pour attributs HTML (data-*, value, title) */
function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function getToken() {
  return localStorage.getItem('100plusshop_token') || sessionStorage.getItem('100plusshop_token');
}

function setToken(token, remember = true) {
  if (remember) {
    localStorage.setItem('100plusshop_token', token);
    sessionStorage.removeItem('100plusshop_token');
  } else {
    sessionStorage.setItem('100plusshop_token', token);
    localStorage.removeItem('100plusshop_token');
  }
}

function clearToken() {
  localStorage.removeItem('100plusshop_token');
  sessionStorage.removeItem('100plusshop_token');
  localStorage.removeItem('100plusshop_user');
  localStorage.removeItem('100plusshop_remember');
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('100plusshop_user') || 'null');
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem('100plusshop_user', JSON.stringify(user));
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // PDF / fichier binaire
  if (options.blob) {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));

  // 401 = session invalide → déconnexion
  // 403 = droits insuffisants → message, sans déconnecter
  if (res.status === 401) {
    if (!path.includes('/auth/')) {
      clearToken();
      window.location.href = 'index.html';
    }
    throw new Error(data.message || 'Session expirée');
  }
  if (res.status === 403) {
    throw new Error(data.message || 'Accès refusé pour ce rôle');
  }
  if (!res.ok) {
    throw new Error(data.message || data.erreur || `Erreur ${res.status}`);
  }
  return data;
}

const AuthAPI = {
  login: (email, motDePasse) =>
    api('/auth/connexion', {
      method: 'POST',
      body: JSON.stringify({ email, motDePasse }),
    }),
  register: (payload) =>
    api('/auth/inscription', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

const DashboardAPI = {
  get: () => api('/dashboard'),
};

const ProduitsAPI = {
  list: () => api('/produits'),
  get: (id) => api(`/produits/${id}`),
  stockFaible: () => api('/produits/stock-faible'),
  create: (body) => api('/produits', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/produits/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/produits/${id}`, { method: 'DELETE' }),
  creerVariante: (idProduit, body) =>
    api(`/produits/${idProduit}/variantes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

const MarquesAPI = {
  list: () => api('/marques'),
  create: (body) => api('/marques', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id) => api('/marques/' + id, { method: 'DELETE' }),
};

const CategoriesAPI = {
  list: () => api('/categories'),
  create: (body) => api('/categories', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id) => api('/categories/' + id, { method: 'DELETE' }),
};

const VentesAPI = {
  list: () => api('/ventes'),
  get: (id) => api(`/ventes/${id}`),
  create: (body) => api('/ventes', { method: 'POST', body: JSON.stringify(body) }),
  annuler: (id) => api(`/ventes/${id}/annuler`, { method: 'PATCH' }),
};

const ClientsAPI = {
  list: () => api('/clients'),
  get: (id) => api(`/clients/${id}`),
  create: (body) => api('/clients', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/clients/${id}`, { method: 'DELETE' }),
};

const StocksAPI = {
  resume: () => api('/stocks/resume'),
  mouvements: (params = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page);
    if (params.limit) q.set('limit', params.limit);
    const s = q.toString();
    return api('/stocks/mouvements' + (s ? '?' + s : ''));
  },
  alertes: () => api('/stocks/alertes'),
  flux: () => api('/stocks/flux'),
  createMouvement: (body) =>
    api('/stocks/mouvements', { method: 'POST', body: JSON.stringify(body) }),
};

const FacturesAPI = {
  resume: () => api('/factures/resume'),
  list: (statut) => api('/factures' + (statut ? `?statut=${encodeURIComponent(statut)}` : '')),
  get: (id) => api(`/factures/${id}`),
  create: (body) => api('/factures', { method: 'POST', body: JSON.stringify(body) }),
  setStatut: (id, statut) =>
    api(`/factures/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ statut }) }),

  /**
   * Télécharge le PDF puis propose l'impression.
   * Si l'utilisateur accepte, ouvre le dialogue d'impression système
   * (imprimantes détectées par Windows / le navigateur).
   */
  pdf: async (id) => {
    const blob = await api(`/factures/${id}/pdf`, { blob: true });
    const url = URL.createObjectURL(blob);

    // 1) Téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // 2) Demande d'impression
    const veutImprimer = window.confirm(
      'Facture téléchargée.\n\nVoulez-vous imprimer la facture maintenant ?'
    );
    if (!veutImprimer) {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }

    // 3) Impression (dialogue système = liste des imprimantes disponibles)
    try {
      const iframe = document.createElement('iframe');
      iframe.style.cssText =
        'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
      iframe.src = url;
      document.body.appendChild(iframe);

      let printed = false;
      const doPrint = () => {
        if (printed) return;
        printed = true;
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          const w = window.open(url, '_blank');
          if (w) {
            w.addEventListener('load', () => {
              try {
                w.print();
              } catch (_) {}
            });
          } else {
            alert(
              'Impossible d’ouvrir l’impression automatiquement.\n' +
                'Autorisez les pop-ups ou ouvrez le PDF téléchargé et imprimez (Ctrl+P).'
            );
          }
        }
        setTimeout(() => {
          try {
            iframe.remove();
          } catch (_) {}
          URL.revokeObjectURL(url);
        }, 120000);
      };

      iframe.onload = doPrint;
      setTimeout(doPrint, 800);
    } catch (e) {
      alert(
        'Impression impossible depuis le navigateur.\n' +
          'Ouvrez le fichier facture-' +
          id +
          '.pdf téléchargé et utilisez Ctrl+P.'
      );
      URL.revokeObjectURL(url);
    }
  },
};

const UtilisateursAPI = {
  list: () => api('/utilisateurs'),
  roles: () => api('/utilisateurs/roles'),
  get: (id) => api(`/utilisateurs/${id}`),
  create: (body) => api('/utilisateurs', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/utilisateurs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/utilisateurs/${id}`, { method: 'DELETE' }),
};

const DepensesAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api('/depenses' + (q ? '?' + q : ''));
  },
  create: (body) => api('/depenses', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/depenses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/depenses/${id}`, { method: 'DELETE' }),
};

const RapportsAPI = {
  comptable: (debut, fin) => {
    const q = new URLSearchParams();
    if (debut) q.set('debut', debut);
    if (fin) q.set('fin', fin);
    const s = q.toString();
    return api('/rapports/comptable' + (s ? '?' + s : ''));
  },
  exportExcel: async (debut, fin) => {
    const q = new URLSearchParams();
    if (debut) q.set('debut', debut);
    if (fin) q.set('fin', fin);
    const token = getToken();
    const res = await fetch(`${API_BASE}/rapports/comptable/export?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export impossible');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `100plusshop_rapport_${debut}_${fin}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

const FournisseursAPI = {
  list: () => api('/fournisseurs'),
  get: (id) => api(`/fournisseurs/${id}`),
  create: (body) => api('/fournisseurs', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/fournisseurs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/fournisseurs/${id}`, { method: 'DELETE' }),
};

const AchatsAPI = {
  list: () => api('/achats'),
  get: (id) => api(`/achats/${id}`),
  create: (body) => api('/achats', { method: 'POST', body: JSON.stringify(body) }),
};

const PromotionsAPI = {
  list: () => api('/promotions'),
  get: (id) => api(`/promotions/${id}`),
  create: (body) => api('/promotions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/promotions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => api(`/promotions/${id}`, { method: 'DELETE' }),
  pourVariante: (idVariante) => api(`/promotions/variante/${idVariante}`),
};

const AuditAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.module) q.set('module', params.module);
    if (params.action) q.set('action', params.action);
    if (params.limit != null) q.set('limit', params.limit);
    if (params.page != null) q.set('page', params.page);
    if (params.offset != null) q.set('offset', params.offset);
    const s = q.toString();
    return api('/audit' + (s ? '?' + s : ''));
  },
};

const CorbeilleAPI = {
  list: () => api('/corbeille'),
  restoreUser: (id) => api(`/corbeille/utilisateurs/${id}/restore`, { method: 'POST' }),
  restoreClient: (id) => api(`/corbeille/clients/${id}/restore`, { method: 'POST' }),
  restoreProduit: (id) => api(`/corbeille/produits/${id}/restore`, { method: 'POST' }),
  purgeUser: (id) => api(`/corbeille/utilisateurs/${id}`, { method: 'DELETE' }),
};
