if (!getToken()) {
  window.location.href = 'index.html';
}

const user = getUser();
const role = String(user?.role || '').toLowerCase().trim();

const chip = document.getElementById('userChip');
if (user) {
  const initials = ((user.prenom || '')[0] || '') + ((user.nom || '')[0] || '');
  chip.textContent = initials.toUpperCase() || 'U';
  chip.title = `${user.prenom || ''} ${user.nom || ''} (${user.role || ''})`;
}

document.getElementById('btnLogout').addEventListener('click', (e) => {
  e.preventDefault();
  clearToken();
  window.location.href = 'index.html';
});

/* ===== Menus autorisés par rôle ===== */
const MENUS_PAR_ROLE = {
  administrateur: [
    'dashboard', 'produits', 'pos', 'ventes', 'clients', 'stocks',
    'factures', 'depenses', 'rapports', 'fournisseurs', 'achats',
    'promotions', 'utilisateurs', 'journal', 'corbeille',
  ],
  gerant: [
    'dashboard', 'produits', 'pos', 'ventes', 'clients', 'stocks',
    'factures', 'depenses', 'rapports', 'fournisseurs', 'achats',
    'promotions',
  ],
  vendeur: [
    'dashboard', 'produits', 'pos', 'ventes', 'clients', 'stocks', 'factures',
  ],
};

function menusAutorises() {
  return MENUS_PAR_ROLE[role] || MENUS_PAR_ROLE.vendeur;
}

function appliquerMenusSelonRole() {
  const autorises = menusAutorises();
  document.querySelectorAll('.nav-item[data-page]').forEach((el) => {
    const page = el.dataset.page;
    if (autorises.includes(page)) {
      el.style.display = '';
      el.classList.remove('nav-hidden');
    } else {
      el.style.display = 'none';
      el.classList.add('nav-hidden');
    }
  });
}

appliquerMenusSelonRole();

/* ===== Sidebar PC / mobile ===== */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const btnOpen = document.getElementById('btnOpenSidebar');
const btnClose = document.getElementById('btnCloseSidebar');

function isMobileNav() {
  return window.matchMedia('(max-width: 1024px)').matches;
}

function openSidebar() {
  if (isMobileNav()) {
    document.body.classList.remove('sidebar-collapsed');
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    document.body.classList.add('sidebar-open');
  } else {
    document.body.classList.remove('sidebar-collapsed');
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
  }
}

function closeSidebar() {
  if (isMobileNav()) {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
  } else {
    document.body.classList.add('sidebar-collapsed');
  }
}

function toggleSidebar() {
  if (isMobileNav()) {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  } else {
    document.body.classList.toggle('sidebar-collapsed');
  }
}

btnOpen?.addEventListener('click', toggleSidebar);
btnClose?.addEventListener('click', closeSidebar);
overlay?.addEventListener('click', closeSidebar);

window.addEventListener('resize', () => {
  if (!isMobileNav()) {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
  }
});

const pages = {
  dashboard: renderDashboard,
  produits: renderProduits,
  ventes: renderVentes,
  clients: renderClients,
  stocks: renderStocks,
  factures: renderFactures,
  pos: renderPOS,
  depenses: renderDepenses,
  rapports: renderRapports,
  fournisseurs: renderFournisseurs,
  achats: renderAchats,
  promotions: renderPromotions,
  utilisateurs: renderUtilisateurs,
  journal: renderJournal,
  corbeille: renderCorbeille,
};

const titles = {
  dashboard: 'Tableau de bord',
  produits: 'Produits',
  ventes: 'Historique des ventes',
  clients: 'Clients',
  stocks: 'Stocks',
  factures: 'Factures',
  pos: 'Point de vente (POS)',
  depenses: 'Dépenses',
  rapports: 'Rapports comptables',
  fournisseurs: 'Fournisseurs',
  achats: 'Achats fournisseurs',
  promotions: 'Promotions',
  utilisateurs: 'Utilisateurs',
  journal: 'Journal d\'activité',
  corbeille: 'Corbeille',
};


function enrichTablesForMobile(root) {
  root.querySelectorAll('table.data').forEach((table) => {
    const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach((tr) => {
      Array.from(tr.children).forEach((td, i) => {
        if (!td.getAttribute('data-label') && headers[i]) {
          td.setAttribute('data-label', headers[i]);
        }
      });
    });
  });
}

window.navigate = async function navigate(page) {
  const autorises = menusAutorises();
  if (!autorises.includes(page)) {
    const content = document.getElementById('pageContent');
    content.innerHTML = `<div class="error-box">Accès refusé pour le rôle « ${user?.role || role} ».</div>`;
    if (isMobileNav()) {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
      document.body.classList.remove('sidebar-open');
    }
    return;
  }

  document.querySelectorAll('.nav-item[data-page]').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  document.getElementById('breadcrumb').textContent = titles[page] || page;
  const content = document.getElementById('pageContent');
  content.innerHTML = '<div class="loading-state">Chargement…</div>';
  // Fermer uniquement le tiroir mobile (ne pas réduire la barre PC)
  if (isMobileNav()) {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
  }
  try {
    await pages[page](content);
    enrichTablesForMobile(content);
  } catch (err) {
    content.innerHTML = `<div class="error-box">${err.message}</div>`;
  }
};

document.querySelectorAll('.nav-item[data-page]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(el.dataset.page);
  });
});

navigate('dashboard');

/* --- PWA : bandeau hors ligne --- */
(function setupOfflineBanner() {
  function ensureBanner() {
    var el = document.getElementById('offline-banner');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'offline-banner';
    el.setAttribute('role', 'status');
    el.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;color:#fff;text-align:center;padding:8px 12px;font-size:13px;font-weight:600;';
    el.textContent = 'Mode hors ligne — interface disponible, les données serveur sont inaccessibles.';
    document.body.prepend(el);
    return el;
  }
  function sync() {
    var el = ensureBanner();
    el.style.display = navigator.onLine ? 'none' : 'block';
  }
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync);
  } else {
    sync();
  }
})();
