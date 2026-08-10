/* Dépenses — filtres, total, édition (v20260810d) */
var depensesCache = [];
var depensesPage = 1;
var depensesRootEl = null;
var depEditId = null;

var DEP_CATEGORIES = [
  { value: 'loyer', label: 'Loyer' },
  { value: 'salaires', label: 'Salaires' },
  { value: 'fournitures', label: 'Fournitures' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'transport', label: 'Transport' },
  { value: 'autre', label: 'Autre' },
];

function depCatOptions(selected) {
  return DEP_CATEGORIES.map(function (c) {
    return (
      '<option value="' +
      c.value +
      '"' +
      (selected === c.value ? ' selected' : '') +
      '>' +
      c.label +
      '</option>'
    );
  }).join('');
}

function depMonthBounds() {
  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth() + 1).padStart(2, '0');
  var last = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    debut: y + '-' + m + '-01',
    fin: y + '-' + m + '-' + String(last).padStart(2, '0'),
  };
}

function toDateTimeLocalValue(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes())
  );
}

async function renderDepenses(el) {
  depensesRootEl = el;
  if (!el) return;

  var bounds = depMonthBounds();
  el.innerHTML =
    '<div class="toolbar" style="flex-wrap:wrap;gap:8px;align-items:end">' +
    '<button type="button" class="btn btn-primary" id="btnNewDep">+ Nouvelle dépense</button>' +
    '<button type="button" class="btn" id="btnRefreshDep">Actualiser</button>' +
    '<div><label style="font-size:12px;display:block">Du</label>' +
    '<input type="date" id="depDebut" value="' +
    bounds.debut +
    '" /></div>' +
    '<div><label style="font-size:12px;display:block">Au</label>' +
    '<input type="date" id="depFin" value="' +
    bounds.fin +
    '" /></div>' +
    '<div><label style="font-size:12px;display:block">Catégorie</label>' +
    '<select id="depFilterCat"><option value="">Toutes</option>' +
    depCatOptions('') +
    '</select></div>' +
    '<button type="button" class="btn btn-primary" id="btnFilterDep">Filtrer</button>' +
    '</div>' +
    '<div class="cards-row" id="depStats"></div>' +
    '<div class="panel" id="depForm" style="display:none">' +
    '<div class="panel-title" id="depFormTitle">Nouvelle dépense</div>' +
    '<p style="font-size:13px;opacity:.75;margin:0 0 10px">Astuce : les achats fournisseurs se saisissent dans <strong>Achats</strong>, pas ici (évite le double comptage dans les rapports).</p>' +
    '<div class="form-grid">' +
    '<div><label>Libellé *</label><input id="dLib" placeholder="Loyer boutique" maxlength="200" /></div>' +
    '<div><label>Catégorie</label><select id="dCat">' +
    depCatOptions('autre') +
    '</select></div>' +
    '<div><label>Montant * (FCFA)</label><input id="dMontant" type="number" min="1" step="1" /></div>' +
    '<div><label>Date</label><input id="dDate" type="datetime-local" /></div>' +
    '</div>' +
    '<div style="margin-top:12px;display:flex;gap:8px">' +
    '<button type="button" class="btn btn-primary" id="btnSaveDep">Enregistrer</button>' +
    '<button type="button" class="btn" id="btnCancelDep">Annuler</button>' +
    '</div></div>' +
    '<div class="panel">' +
    '<div class="panel-title" id="depListTitle">Dépenses</div>' +
    '<div id="depTableWrap"></div></div>';

  document.getElementById('btnRefreshDep').onclick = function () {
    loadDepenses();
  };
  document.getElementById('btnFilterDep').onclick = function () {
    depensesPage = 1;
    loadDepenses();
  };
  document.getElementById('btnNewDep').onclick = function () {
    openDepForm(null);
  };
  document.getElementById('btnCancelDep').onclick = function () {
    closeDepForm();
  };
  document.getElementById('btnSaveDep').onclick = function () {
    saveDepense();
  };

  await loadDepenses();
}

async function loadDepenses() {
  var wrap = document.getElementById('depTableWrap');
  if (wrap) wrap.innerHTML = '<div class="loading-state">Chargement…</div>';

  var params = {};
  var debut = document.getElementById('depDebut');
  var fin = document.getElementById('depFin');
  var cat = document.getElementById('depFilterCat');
  if (debut && debut.value) params.debut = debut.value;
  if (fin && fin.value) params.fin = fin.value;
  if (cat && cat.value) params.categorie = cat.value;

  try {
    var data = await DepensesAPI.list(params);
    depensesCache = Array.isArray(data) ? data : [];
  } catch (e) {
    if (wrap) wrap.innerHTML = '<div class="error-box">' + escapeHtml(e.message || String(e)) + '</div>';
    return;
  }
  paintDepStats();
  paintDepensesTable();
}

function paintDepStats() {
  var box = document.getElementById('depStats');
  if (!box) return;
  var total = 0;
  var n = depensesCache.length;
  depensesCache.forEach(function (d) {
    total += Number(d.montant) || 0;
  });
  box.innerHTML =
    '<div class="stat-card"><div class="label">Nombre</div><div class="value">' +
    n +
    '</div></div>' +
    '<div class="stat-card"><div class="label">Total période</div><div class="value" style="color:var(--danger)">' +
    formatMontant(total) +
    '</div></div>';
}

function openDepForm(dep) {
  depEditId = dep ? dep.id_depense : null;
  var form = document.getElementById('depForm');
  var title = document.getElementById('depFormTitle');
  form.style.display = 'block';
  title.textContent = dep ? 'Modifier la dépense #' + dep.id_depense : 'Nouvelle dépense';
  document.getElementById('dLib').value = dep ? dep.libelle || '' : '';
  document.getElementById('dCat').value = dep && dep.categorie ? dep.categorie : 'autre';
  document.getElementById('dMontant').value = dep && dep.montant != null ? dep.montant : '';
  document.getElementById('dDate').value = dep ? toDateTimeLocalValue(dep.date_depense) : '';
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeDepForm() {
  depEditId = null;
  document.getElementById('depForm').style.display = 'none';
  document.getElementById('dLib').value = '';
  document.getElementById('dMontant').value = '';
  document.getElementById('dDate').value = '';
  document.getElementById('dCat').value = 'autre';
}

async function saveDepense() {
  var libelle = document.getElementById('dLib').value.trim();
  var categorie = document.getElementById('dCat').value;
  var montant = Number(document.getElementById('dMontant').value);
  var dateVal = document.getElementById('dDate').value;

  if (!libelle) {
    alert('Le libellé est obligatoire.');
    return;
  }
  if (!(montant > 0)) {
    alert('Le montant doit être supérieur à zéro.');
    return;
  }

  var body = {
    libelle: libelle,
    categorie: categorie || 'autre',
    montant: montant,
  };
  if (dateVal) {
    body.dateDepense = dateVal.replace('T', ' ') + ':00';
  }

  try {
    if (depEditId) {
      await DepensesAPI.update(depEditId, body);
    } else {
      await DepensesAPI.create(body);
    }
    closeDepForm();
    await loadDepenses();
  } catch (e) {
    alert(e.message || String(e));
  }
}

function paintDepensesTable() {
  var wrap = document.getElementById('depTableWrap');
  var title = document.getElementById('depListTitle');
  if (!wrap) return;

  var pageSize = typeof PAGE_SIZE !== 'undefined' ? PAGE_SIZE : 15;
  var total = depensesCache.length;
  var totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  if (depensesPage > totalPages) depensesPage = totalPages;
  if (depensesPage < 1) depensesPage = 1;
  var start = (depensesPage - 1) * pageSize;
  var items = depensesCache.slice(start, start + pageSize);
  var from = total === 0 ? 0 : start + 1;
  var to = Math.min(start + pageSize, total);

  if (title) title.textContent = 'Dépenses (' + total + ')';

  if (total === 0) {
    wrap.innerHTML = '<div class="empty">Aucune dépense sur cette période</div>';
    return;
  }

  var rows = items
    .map(function (d) {
      return (
        '<tr>' +
        '<td>' +
        (d.date_depense ? new Date(d.date_depense).toLocaleString('fr-FR') : '—') +
        '</td>' +
        '<td><strong>' +
        escapeHtml(d.libelle || '—') +
        '</strong></td>' +
        '<td><span class="badge gray">' +
        escapeHtml(d.categorie || '—') +
        '</span></td>' +
        '<td><strong>' +
        formatMontant(d.montant) +
        '</strong></td>' +
        '<td>' +
        escapeHtml((d.user_prenom || '') + ' ' + (d.user_nom || '')).trim() +
        '</td>' +
        '<td style="white-space:nowrap">' +
        '<button type="button" class="btn btn-sm" data-edit="' +
        d.id_depense +
        '">Modifier</button> ' +
        '<button type="button" class="btn btn-sm" data-del="' +
        d.id_depense +
        '">Suppr.</button>' +
        '</td></tr>'
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
    '<button type="button" class="btn btn-sm" id="depPrev" ' +
    (depensesPage <= 1 ? 'disabled' : '') +
    '>‹ Préc.</button>' +
    '<span>Page ' +
    depensesPage +
    ' / ' +
    totalPages +
    '</span>' +
    '<button type="button" class="btn btn-sm" id="depNext" ' +
    (depensesPage >= totalPages ? 'disabled' : '') +
    '>Suiv. ›</button></div>';

  wrap.innerHTML =
    '<div style="overflow:auto"><table class="data"><thead><tr>' +
    '<th>Date</th><th>Libellé</th><th>Catégorie</th><th>Montant</th><th>Par</th><th></th>' +
    '</tr></thead><tbody>' +
    rows +
    '</tbody></table></div>' +
    pag;

  document.getElementById('depPrev').onclick = function () {
    depensesPage -= 1;
    paintDepensesTable();
  };
  document.getElementById('depNext').onclick = function () {
    depensesPage += 1;
    paintDepensesTable();
  };

  wrap.querySelectorAll('[data-edit]').forEach(function (btn) {
    btn.onclick = function () {
      var id = Number(btn.getAttribute('data-edit'));
      var dep = depensesCache.find(function (x) {
        return Number(x.id_depense) === id;
      });
      if (dep) openDepForm(dep);
    };
  });

  wrap.querySelectorAll('[data-del]').forEach(function (btn) {
    btn.onclick = async function () {
      if (!confirm('Supprimer cette dépense ?')) return;
      try {
        await DepensesAPI.remove(btn.getAttribute('data-del'));
        await loadDepenses();
      } catch (e) {
        alert(e.message);
      }
    };
  });
}
