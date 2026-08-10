/* Historique des ventes — articles + recherche stable (v20260810c) */
var ventesCache = [];
var ventesPage = 1;
var ventesQuery = '';
var ventesOpenId = null;
var ventesRootEl = null;

async function renderVentes(el) {
  ventesRootEl = el;
  if (!el) return;
  el.innerHTML = '<div class="loading-state">Chargement de l\'historique…</div>';
  try {
    var data = await VentesAPI.list();
    ventesCache = Array.isArray(data) ? data : (data && data.rows ? data.rows : []);
    console.log('[ventes] list count=', ventesCache.length);
  } catch (e) {
    console.error('[ventes] list error', e);
    el.innerHTML = '<div class="error-box">Erreur chargement ventes : ' + escapeHtml(e.message || String(e)) + '</div>';
    return;
  }
  ventesPage = 1;
  ventesQuery = '';
  ventesOpenId = null;
  buildVentesShell(el);
  paintVentesTable();
}

function buildVentesShell(el) {
  el.innerHTML =
    '<div class="toolbar">' +
    '<button type="button" class="btn btn-primary" id="btnRefreshVentes">Actualiser</button>' +
    '<input type="search" id="ventesSearch" placeholder="N° commande, client, article…" ' +
    'autocomplete="off" style="margin-left:12px;padding:6px 8px;border-radius:6px;min-width:240px" />' +
    '</div>' +
    '<div class="panel">' +
    '<div class="panel-title" id="ventesTitle">Historique des ventes</div>' +
    '<div id="ventesTableWrap"></div>' +
    '</div>';

  document.getElementById('btnRefreshVentes').onclick = function () {
    renderVentes(el);
  };

  var searchEl = document.getElementById('ventesSearch');
  // input seulement : on ne recrée PAS l'input → le curseur reste en place
  searchEl.addEventListener('input', function (e) {
    ventesQuery = e.target.value || '';
    ventesPage = 1;
    paintVentesTable();
  });
}

function normalizeDetails(d) {
  if (!d) return [];
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch (e) { return []; }
  }
  return Array.isArray(d) ? d : [];
}

function articlesLabel(v) {
  if (v.articles_resume && String(v.articles_resume).trim()) {
    return String(v.articles_resume).trim();
  }
  var details = normalizeDetails(v.details);
  if (!details.length) return '';
  return details.map(function (l) {
    return (l.produit_nom || 'Article') + ' ×' + (l.quantite != null ? l.quantite : '?');
  }).join(', ');
}

function ventesFiltered() {
  var q = (ventesQuery || '').trim().toLowerCase();
  if (!q) return ventesCache;

  // enlever préfixe CMD- pour la recherche par numéro
  var qNum = q.replace(/^cmd\s*-?\s*/i, '').trim();

  return ventesCache.filter(function (v) {
    var id = String(v.id_vente != null ? v.id_vente : '');
    var cmd = 'cmd-' + id;
    var details = normalizeDetails(v.details);
    var art = details.map(function (d) {
      return [d.produit_nom, d.reference, d.taille, d.couleur].join(' ');
    }).join(' ');

    var hay = [
      id,
      cmd,
      'cmd-' + id,
      v.date_vente,
      v.client_prenom,
      v.client_nom,
      v.vendeur_prenom,
      v.vendeur_nom,
      v.mode_paiement_principal,
      v.statut,
      v.montant_total,
      v.articles_resume,
      art
    ].join(' ').toLowerCase();

    if (hay.indexOf(q) !== -1) return true;
    // match numéro seul : "40" trouve CMD-40
    if (qNum && (id === qNum || id.indexOf(qNum) !== -1 || cmd.indexOf(qNum) !== -1)) return true;
    return false;
  });
}

function renderDetailsTable(id, lines) {
  if (!lines || !lines.length) {
    return '<div class="empty">Aucun article sur cette vente</div>';
  }
  var body = lines.map(function (l) {
    return '<tr><td><strong>' + escapeHtml(l.produit_nom || '—') + '</strong></td><td>' +
      escapeHtml(l.reference || '—') + '</td><td>' + escapeHtml(l.taille || '—') + '</td><td>' +
      escapeHtml(l.couleur || '—') + '</td><td>' + (l.quantite != null ? l.quantite : '—') + '</td><td>' +
      formatMontant(l.prix_unitaire) + '</td><td>' + formatMontant(l.remise || 0) + '</td><td><strong>' +
      formatMontant(l.sous_total) + '</strong></td></tr>';
  }).join('');
  return '<div style="font-weight:600;margin-bottom:8px">Articles — CMD-' + id + '</div>' +
    '<table class="data" style="margin:0"><thead><tr>' +
    '<th>Produit</th><th>Réf.</th><th>Taille</th><th>Couleur</th><th>Qté</th><th>P.U.</th><th>Remise</th><th>Sous-total</th>' +
    '</tr></thead><tbody>' + body + '</tbody></table>';
}

function paintVentesTable() {
  var wrap = document.getElementById('ventesTableWrap');
  var title = document.getElementById('ventesTitle');
  if (!wrap) return;

  var filtered = ventesFiltered();
  var pageSize = typeof PAGE_SIZE !== 'undefined' ? PAGE_SIZE : 15;
  var total = filtered.length;
  var totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  if (ventesPage > totalPages) ventesPage = totalPages;
  if (ventesPage < 1) ventesPage = 1;
  var start = (ventesPage - 1) * pageSize;
  var items = filtered.slice(start, start + pageSize);
  var from = total === 0 ? 0 : start + 1;
  var to = Math.min(start + pageSize, total);

  if (title) title.textContent = 'Historique des ventes (' + total + ')';

  if (total === 0) {
    wrap.innerHTML = '<div class="empty">Aucune vente' +
      (ventesQuery ? ' pour « ' + escapeHtml(ventesQuery) + ' »' : '') + '</div>';
    return;
  }

  var rowsHtml = items.map(function (v) {
    var id = Number(v.id_vente);
    var open = ventesOpenId === id;
    var label = articlesLabel(v);
    var resumeHtml = label ? escapeHtml(label) : '<span style="opacity:.55">—</span>';
    var actions = '<button type="button" class="btn btn-sm" data-detail="' + id + '">' +
      (open ? 'Masquer' : 'Détail') + '</button> ';
    if (v.statut === 'validee') {
      actions += '<button type="button" class="btn btn-sm" data-annuler="' + id + '">Annuler</button> ';
      actions += '<button type="button" class="btn btn-sm btn-primary" data-facture="' + id + '">Facturer</button>';
    }
    var detailRow = open
      ? '<tr><td colspan="8" style="background:rgba(0,0,0,.04);padding:12px 16px"><div id="venteDetail-' +
        id + '">' + renderDetailsTable(id, normalizeDetails(v.details)) + '</div></td></tr>'
      : '';
    return '<tr>' +
      '<td><strong style="color:var(--primary)">CMD-' + id + '</strong></td>' +
      '<td>' + (v.date_vente ? new Date(v.date_vente).toLocaleString('fr-FR') : '—') + '</td>' +
      '<td>' + (v.client_prenom ? escapeHtml(v.client_prenom + ' ' + (v.client_nom || '')) : 'Anonyme') + '</td>' +
      '<td style="max-width:300px;font-size:13px">' + resumeHtml + '</td>' +
      '<td>' + escapeHtml(v.mode_paiement_principal || '—') + '</td>' +
      '<td><span class="badge ' +
        (v.statut === 'validee' ? 'green' : v.statut === 'annulee' ? 'red' : 'orange') + '">' +
        escapeHtml(v.statut || '') + '</span></td>' +
      '<td><strong>' + formatMontant(v.montant_total) + '</strong></td>' +
      '<td style="white-space:nowrap">' + actions + '</td>' +
      '</tr>' + detailRow;
  }).join('');

  var pag = '<div class="pagination" style="margin-top:12px;display:flex;gap:12px;align-items:center">' +
    '<span>' + from + '–' + to + ' sur ' + total + '</span>' +
    '<button type="button" class="btn btn-sm" id="ventesPrev" ' + (ventesPage <= 1 ? 'disabled' : '') + '>‹ Préc.</button>' +
    '<span>Page ' + ventesPage + ' / ' + totalPages + '</span>' +
    '<button type="button" class="btn btn-sm" id="ventesNext" ' + (ventesPage >= totalPages ? 'disabled' : '') + '>Suiv. ›</button>' +
    '</div>';

  wrap.innerHTML =
    '<div style="overflow:auto"><table class="data"><thead><tr>' +
    '<th>Commande</th><th>Date</th><th>Client</th><th>Articles vendus</th>' +
    '<th>Paiement</th><th>Statut</th><th>Total</th><th></th>' +
    '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' + pag;

  var prev = document.getElementById('ventesPrev');
  var next = document.getElementById('ventesNext');
  if (prev) prev.onclick = function () { ventesPage -= 1; paintVentesTable(); };
  if (next) next.onclick = function () { ventesPage += 1; paintVentesTable(); };

  wrap.querySelectorAll('[data-detail]').forEach(function (btn) {
    btn.onclick = async function () {
      var id = Number(btn.getAttribute('data-detail'));
      if (ventesOpenId === id) {
        ventesOpenId = null;
        paintVentesTable();
        return;
      }
      ventesOpenId = id;
      paintVentesTable();
      var v = ventesCache.find(function (x) { return Number(x.id_vente) === id; });
      var details = normalizeDetails(v && v.details);
      if (!details.length) {
        var box = document.getElementById('venteDetail-' + id);
        if (box) {
          box.innerHTML = 'Chargement…';
          try {
            var full = await VentesAPI.get(id);
            details = normalizeDetails(full.details || full.lignes);
            if (v) v.details = details;
            box.innerHTML = renderDetailsTable(id, details);
          } catch (err) {
            box.innerHTML = '<div class="error-box">' + escapeHtml(err.message || String(err)) + '</div>';
          }
        }
      }
    };
  });

  wrap.querySelectorAll('[data-annuler]').forEach(function (btn) {
    btn.onclick = async function () {
      if (!confirm('Annuler cette vente ?')) return;
      try {
        await VentesAPI.annuler(btn.getAttribute('data-annuler'));
        renderVentes(ventesRootEl);
      } catch (e) {
        alert(e.message);
      }
    };
  });

  wrap.querySelectorAll('[data-facture]').forEach(function (btn) {
    btn.onclick = async function () {
      try {
        await FacturesAPI.create({ idVente: Number(btn.getAttribute('data-facture')), statut: 'Payée' });
        alert('Facture créée !');
        if (typeof navigate === 'function') navigate('factures');
      } catch (e) {
        alert(e.message);
      }
    };
  });
}
