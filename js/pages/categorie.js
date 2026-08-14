async function renderCategories(el) {
  let list = [];
  try {
    list = await CategoriesAPI.list();
    if (!Array.isArray(list)) list = [];
  } catch (e) {
    el.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
    return;
  }

  const role = String(getUser()?.role || '').toLowerCase();
  const peutEcrire = role === 'administrateur' || role === 'gerant';

  el.innerHTML = `
    <div class="toolbar">
      ${peutEcrire ? '<button class="btn btn-primary" id="btnNewCat">+ Catégorie</button>' : ''}
      <button class="btn" id="btnRefreshCats">Actualiser</button>
    </div>

    <div class="panel" id="catForm" style="display:none">
      <div class="panel-title">Nouvelle catégorie</div>
      <div class="form-grid">
        <div><label>Nom *</label><input id="cNom" placeholder="Ex. Robes" /></div>
        <div><label>Description</label><input id="cDesc" placeholder="Optionnel" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary" id="btnSaveCat">Enregistrer</button>
        <button class="btn" id="btnCancelCat">Annuler</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Catégories (${list.length})</div>
      ${
        list.length === 0
          ? '<div class="empty">Aucune catégorie enregistrée</div>'
          : `<div class="table-wrap"><table class="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom</th>
                <th>Description</th>
                <th>Produits</th>
                ${peutEcrire ? '<th></th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${list
                .map(
                  (c) => `
                <tr>
                  <td>${c.id_categorie}</td>
                  <td><strong>${escapeHtml(c.nom || '')}</strong></td>
                  <td>${escapeHtml(c.description || '—')}</td>
                  <td>${c.nb_produits != null ? c.nb_produits : '—'}</td>
                  ${
                    peutEcrire
                      ? `<td>
                    <button type="button" class="btn btn-sm" data-del-cat="${c.id_categorie}" title="Supprimer">
                      Suppr.
                    </button>
                  </td>`
                      : ''
                  }
                </tr>`
                )
                .join('')}
            </tbody>
          </table></div>`
      }
    </div>
  `;

  document.getElementById('btnRefreshCats')?.addEventListener('click', () =>
    renderCategories(el)
  );
  document.getElementById('btnNewCat')?.addEventListener('click', () => {
    document.getElementById('catForm').style.display = 'block';
  });
  document.getElementById('btnCancelCat')?.addEventListener('click', () => {
    document.getElementById('catForm').style.display = 'none';
  });
  document.getElementById('btnSaveCat')?.addEventListener('click', async () => {
    try {
      const nom = document.getElementById('cNom').value.trim();
      if (!nom) return alert('Nom obligatoire');
      await CategoriesAPI.create({
        nom,
        description: document.getElementById('cDesc').value.trim() || null,
      });
      renderCategories(el);
    } catch (e) {
      alert(e.message);
    }
  });

  el.querySelectorAll('[data-del-cat]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette catégorie ?')) return;
      try {
        await CategoriesAPI.remove(btn.dataset.delCat);
        renderCategories(el);
      } catch (e) {
        alert(e.message);
      }
    });
  });
}
