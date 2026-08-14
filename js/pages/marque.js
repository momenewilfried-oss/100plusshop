async function renderMarques(el) {
  let list = [];
  try {
    list = await MarquesAPI.list();
    if (!Array.isArray(list)) list = [];
  } catch (e) {
    el.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
    return;
  }

  const role = String(getUser()?.role || '').toLowerCase();
  const peutEcrire = role === 'administrateur' || role === 'gerant';

  el.innerHTML = `
    <div class="toolbar">
      ${peutEcrire ? '<button class="btn btn-primary" id="btnNewMarque">+ Marque</button>' : ''}
      <button class="btn" id="btnRefreshMarques">Actualiser</button>
    </div>

    <div class="panel" id="marqueForm" style="display:none">
      <div class="panel-title">Nouvelle marque</div>
      <div class="form-grid">
        <div><label>Nom *</label><input id="mNom" placeholder="Ex. Nike" /></div>
        <div><label>Description</label><input id="mDesc" placeholder="Optionnel" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary" id="btnSaveMarque">Enregistrer</button>
        <button class="btn" id="btnCancelMarque">Annuler</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Marques (${list.length})</div>
      ${
        list.length === 0
          ? '<div class="empty">Aucune marque enregistrée</div>'
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
                  (m) => `
                <tr>
                  <td>${m.id_marque}</td>
                  <td><strong>${escapeHtml(m.nom || '')}</strong></td>
                  <td>${escapeHtml(m.description || '—')}</td>
                  <td>${m.nb_produits != null ? m.nb_produits : '—'}</td>
                  ${
                    peutEcrire
                      ? `<td>
                    <button type="button" class="btn btn-sm" data-del-marque="${m.id_marque}" title="Supprimer">
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

  document.getElementById('btnRefreshMarques')?.addEventListener('click', () =>
    renderMarques(el)
  );
  document.getElementById('btnNewMarque')?.addEventListener('click', () => {
    document.getElementById('marqueForm').style.display = 'block';
  });
  document.getElementById('btnCancelMarque')?.addEventListener('click', () => {
    document.getElementById('marqueForm').style.display = 'none';
  });
  document.getElementById('btnSaveMarque')?.addEventListener('click', async () => {
    try {
      const nom = document.getElementById('mNom').value.trim();
      if (!nom) return alert('Nom obligatoire');
      await MarquesAPI.create({
        nom,
        description: document.getElementById('mDesc').value.trim() || null,
      });
      renderMarques(el);
    } catch (e) {
      alert(e.message);
    }
  });

  el.querySelectorAll('[data-del-marque]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette marque ?')) return;
      try {
        await MarquesAPI.remove(btn.dataset.delMarque);
        renderMarques(el);
      } catch (e) {
        alert(e.message);
      }
    });
  });
}
