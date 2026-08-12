/* Factures — recherche stable (v20260810c) */
var facturesCache = [];
var facturesPage = 1;
var facturesQuery = '';
var facturesResume = {};
var facturesRootEl = null;

async function renderFactures(el) {
  facturesRootEl = el;
  if (!el) return;
  el.innerHTML = '<div class="loading-state">Chargement des factures…</div>';

  facturesResume = {};
  try {
    facturesResume = await FacturesAPI.resume();
  } catch (_) {}

  try {
    var data = await FacturesAPI.list();
    facturesCache = Array.isArray(data) ? data : [];
  } catch (e) {
    el.innerHTML = '<div class="error-box">' + escapeHtml(e.message || String(e)) + '</div>';
    return;
  }

  facturesPage = 1;
  facturesQuery = '';
  buildFacturesShell(el);
  paintFacturesTable();
}

function buildFacturesShell(el) {
  var r = facturesResume || {};
  el.innerHTML =
    '<div class="cards-row">' +
    '<div class="stat-card"><div class="label">Total factures</div><div class="value">' +
    (r.total_factures != null ? r.total_factures : facturesCache.length) +
    '</div></div>' +
    '<div class="stat-card"><div class="label">CA ventes (mois)</div><div class="value" style="color:var(--success)">' +
    formatMontant(r.ca_ventes_mois != null ? r.ca_ventes_mois : r.recettes_payees_mois) +
    '</div></div>' +
    '<div class="stat-card"><div class="label">Factures payées (mois)</div><div class="value">' +
    formatMontant(r.factures_payees_mois != null ? r.factures_payees_mois : 0) +
    '</div></div>' +
    '<div class="stat-card"><div class="label">En attente</div><div class="value">' +
    formatMontant(r.en_attente) +
    '</div></div>' +
    '<div class="stat-card"><div class="label">Retards</div><div class="value" style="color:var(--danger)">' +
    formatMontant(r.retards) +
    '</div></div>' +
    '</div>' +
    '<div class="panel">' +
    '<div class="panel-header" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
    '<div class="panel-title" style="margin:0" id="facturesTitle">Factures</div>' +
    '<button type="button" class="btn" id="btnRefreshFact">Actualiser</button>' +
    '<input type="search" id="facturesSearch" placeholder="N°, client, statut…" autocomplete="off" ' +
    'style="margin-left:8px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;min-width:220px" />' +
    '</div>' +
    '<div id="facturesTableWrap"></div>' +
    '</div>';

  document.getElementById('btnRefreshFact').onclick = function () {
    renderFactures(el);
  };

  var searchEl = document.getElementById('facturesSearch');
  searchEl.addEventListener('input', function (e) {
    facturesQuery = e.target.value || '';
    facturesPage = 1;
    paintFacturesTable();
  });
}

function facturesFiltered() {
  var q = (facturesQuery || '').trim().toLowerCase();
  if (!q) return facturesCache;

  var qClean = q.replace(/^fact\s*-?\s*/i, '').trim();

  return facturesCache.filter(function (f) {
    var num = String(f.numero || '');
    var id = String(f.id_facture != null ? f.id_facture : '');
    var hay = [
      num,
      id,
      'fact-' + id,
      f.client_prenom,
      f.client_nom,
      f.date_facture,
      f.montant_total,
      f.statut,
      f.id_vente
    ]
      .join(' ')
      .toLowerCase();

    if (hay.indexOf(q) !== -1) return true;
    if (qClean && (num.toLowerCase().indexOf(qClean) !== -1 || id.indexOf(qClean) !== -1)) return true;
    return false;
  });
}

function paintFacturesTable() {
  var wrap = document.getElementById('facturesTableWrap');
  var title = document.getElementById('facturesTitle');
  if (!wrap) return;

  var filtered = facturesFiltered();
  var pageSize = typeof PAGE_SIZE !== 'undefined' ? PAGE_SIZE : 15;
  var total = filtered.length;
  var totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  if (facturesPage > totalPages) facturesPage = totalPages;
  if (facturesPage < 1) facturesPage = 1;
  var start = (facturesPage - 1) * pageSize;
  var items = filtered.slice(start, start + pageSize);
  var from = total === 0 ? 0 : start + 1;
  var to = Math.min(start + pageSize, total);

  if (title) title.textContent = 'Factures (' + total + ')';

  if (total === 0) {
    wrap.innerHTML =
      '<div class="empty">Aucune facture' +
      (facturesQuery ? ' pour « ' + escapeHtml(facturesQuery) + ' »' : ' — créez-en depuis l\'historique des ventes') +
      '</div>';
    return;
  }

  var rows = items
    .map(function (f) {
      var badge =
        f.statut === 'Payée'
          ? 'green'
          : f.statut === 'Retard'
            ? 'red'
            : f.statut === 'En attente'
              ? 'orange'
              : 'gray';
      var client = f.client_prenom
        ? escapeHtml(f.client_prenom + ' ' + (f.client_nom || ''))
        : '—';
      var pdfBtn =
        f.statut === 'Payée'
          ? '<button type="button" class="btn btn-sm" data-pdf="' + f.id_facture + '">PDF</button> '
          : '';
      return (
        '<tr>' +
        '<td><strong style="color:var(--primary)">' +
        escapeHtml(f.numero || '—') +
        '</strong></td>' +
        '<td>' +
        client +
        '</td>' +
        '<td>' +
        (f.date_facture ? new Date(f.date_facture).toLocaleDateString('fr-FR') : '—') +
        '</td>' +
        '<td><strong>' +
        formatMontant(f.montant_total) +
        '</strong></td>' +
        '<td><span class="badge ' +
        badge +
        '">' +
        escapeHtml(f.statut || '') +
        '</span></td>' +
        '<td style="white-space:nowrap">' +
        pdfBtn +
        '<select class="btn btn-sm" data-statut="' +
        f.id_facture +
        '" style="height:30px">' +
        '<option value="">Statut…</option>' +
        '<option>Payée</option>' +
        '<option>En attente</option>' +
        '<option>Retard</option>' +
        '<option>Annulée</option>' +
        '</select></td></tr>'
      );
    })
    .join('');

  var pag =
    '<div class="pagination" style="margin-top:12px;display:flex;gap:12px;align-items:center">' +
    '<span>' +
    from +
    '–' +
    to +
    ' sur ' +
    total +
    '</span>' +
    '<button type="button" class="btn btn-sm" id="factPrev" ' +
    (facturesPage <= 1 ? 'disabled' : '') +
    '>‹ Préc.</button>' +
    '<span>Page ' +
    facturesPage +
    ' / ' +
    totalPages +
    '</span>' +
    '<button type="button" class="btn btn-sm" id="factNext" ' +
    (facturesPage >= totalPages ? 'disabled' : '') +
    '>Suiv. ›</button></div>';

  wrap.innerHTML =
    '<div style="overflow:auto"><table class="data"><thead><tr>' +
    '<th>N°</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th><th>Actions</th>' +
    '</tr></thead><tbody>' +
    rows +
    '</tbody></table></div>' +
    pag;

  var prev = document.getElementById('factPrev');
  var next = document.getElementById('factNext');
  if (prev)
    prev.onclick = function () {
      facturesPage -= 1;
      paintFacturesTable();
    };
  if (next)
    next.onclick = function () {
      facturesPage += 1;
      paintFacturesTable();
    };

  wrap.querySelectorAll('[data-pdf]').forEach(function (btn) {
    btn.onclick = async function () {
      try {
        await FacturesAPI.pdf(btn.getAttribute('data-pdf'));
      } catch (e) {
        alert(
          e.message +
            '\n(Vérifiez que pdfkit est installé et le dossier public/factures existe)'
        );
      }
    };
  });

  wrap.querySelectorAll('[data-statut]').forEach(function (sel) {
    sel.onchange = async function () {
      if (!sel.value) return;
      try {
        await FacturesAPI.setStatut(sel.getAttribute('data-statut'), sel.value);
        renderFactures(facturesRootEl);
      } catch (e) {
        alert(e.message);
      }
    };
  });
}