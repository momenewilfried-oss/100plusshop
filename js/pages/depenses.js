let depensesCache = [];
let depensesPage = 1;

async function renderDepenses(el) {
  try {
    depensesCache = await DepensesAPI.list();
  } catch (e) {
    el.innerHTML = `<div class="error-box">${e.message}</div>`;
    return;
  }
  depensesPage = 1;
  paintDepenses(el);
}

function paintDepenses(el) {
  const pg = paginateSlice(depensesCache, depensesPage);
  depensesPage = pg.page;

  el.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" id="btnNewDep">+ Nouvelle dépense</button>
      <button class="btn" id="btnRefreshDep">Actualiser</button>
    </div>
    <div class="panel" id="depForm" style="display:none">
      <div class="panel-title">Nouvelle dépense</div>
      <div class="form-grid">
        <div><label>Libellé</label><input id="dLib" placeholder="Loyer boutique" /></div>
        <div><label>Catégorie</label>
          <select id="dCat">
            <option value="loyer">Loyer</option>
            <option value="salaires">Salaires</option>
            <option value="fournitures">Fournitures</option>
            <option value="marketing">Marketing</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div><label>Montant</label><input id="dMontant" type="number" min="0" step="1" /></div>
        <div><label>Date (optionnel)</label><input id="dDate" type="datetime-local" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary" id="btnSaveDep">Enregistrer</button>
        <button class="btn" id="btnCancelDep">Annuler</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Dépenses (${depensesCache.length})</div>
      ${depensesCache.length === 0
        ? '<div class="empty">Aucune dépense</div>'
        : `<table class="data">
            <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Montant</th><th>Par</th><th></th></tr></thead>
            <tbody>
              ${pg.items.map(d => `
                <tr>
                  <td>${d.date_depense ? new Date(d.date_depense).toLocaleDateString('fr-FR') : '-'}</td>
                  <td><strong>${escapeHtml(d.libelle || '-')}</strong></td>
                  <td><span class="badge gray">${escapeHtml(d.categorie || '-')}</span></td>
                  <td><strong>${formatMontant(d.montant)}</strong></td>
                  <td>${escapeHtml(d.user_prenom || '')} ${escapeHtml(d.user_nom || '')}</td>
                  <td><button class="btn btn-sm" data-del="${d.id_depense}">Suppr.</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${paginationHtml(pg)}`}
    </div>
  `;

  document.getElementById('btnRefreshDep')?.addEventListener('click', () => renderDepenses(el));
  document.getElementById('btnNewDep')?.addEventListener('click', () => {
    document.getElementById('depForm').style.display = 'block';
  });
  document.getElementById('btnCancelDep')?.addEventListener('click', () => {
    document.getElementById('depForm').style.display = 'none';
  });
  document.getElementById('btnSaveDep')?.addEventListener('click', async () => {
    try {
      const dateVal = document.getElementById('dDate').value;
      await DepensesAPI.create({
        libelle: document.getElementById('dLib').value.trim(),
        categorie: document.getElementById('dCat').value,
        montant: Number(document.getElementById('dMontant').value),
        dateDepense: dateVal ? dateVal.replace('T', ' ') + ':00' : undefined,
      });
      renderDepenses(el);
    } catch (e) {
      alert(e.message);
    }
  });

  bindPagination(el, (delta) => {
    depensesPage += delta;
    paintDepenses(el);
  });

  el.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette dépense ?')) return;
      try {
        await DepensesAPI.remove(btn.dataset.del);
        renderDepenses(el);
      } catch (e) {
        alert(e.message);
      }
    });
  });
}
