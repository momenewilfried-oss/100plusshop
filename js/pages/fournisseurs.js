async function renderFournisseurs(el) {
  let list = [];
  try {
    list = await FournisseursAPI.list();
    if (!Array.isArray(list)) list = [];
  } catch (e) {
    el.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
    return;
  }

  el.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" id="btnNewFour">+ Fournisseur</button>
      <button class="btn" id="btnRefreshFour">Actualiser</button>
    </div>
    <div class="panel" id="fourForm" style="display:none">
      <div class="panel-title">Nouveau fournisseur</div>
      <div class="form-grid">
        <div><label>Nom</label><input id="fNom" /></div>
        <div><label>Contact</label><input id="fContact" /></div>
        <div><label>Email</label><input id="fEmail" type="email" /></div>
        <div style="grid-column:1/-1"><label>Adresse</label><input id="fAdresse" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary" id="btnSaveFour">Enregistrer</button>
        <button class="btn" id="btnCancelFour">Annuler</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Fournisseurs (${list.length})</div>
      ${list.length === 0
        ? '<div class="empty">Aucun fournisseur</div>'
        : `<table class="data">
            <thead>
              <tr>
                <th>ID</th><th>Nom</th><th>Contact</th><th>Email</th><th>Adresse</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${list.map((f) => `
                <tr>
                  <td>${f.id_fournisseur}</td>
                  <td><strong>${escapeHtml(f.nom || '')}</strong></td>
                  <td>${escapeHtml(f.contact || '-')}</td>
                  <td>${escapeHtml(f.email || '-')}</td>
                  <td>${escapeHtml(f.adresse || '-')}</td>
                  <td>
                    <button type="button" class="btn btn-sm" data-del-four="${f.id_fournisseur}" title="Supprimer">
                      Suppr.
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>`}
    </div>
  `;

  document.getElementById('btnRefreshFour')?.addEventListener('click', () => renderFournisseurs(el));
  document.getElementById('btnNewFour')?.addEventListener('click', () => {
    document.getElementById('fourForm').style.display = 'block';
  });
  document.getElementById('btnCancelFour')?.addEventListener('click', () => {
    document.getElementById('fourForm').style.display = 'none';
  });

  document.getElementById('btnSaveFour')?.addEventListener('click', async () => {
    try {
      const nom = document.getElementById('fNom').value.trim();
      if (!nom) {
        alert('Le nom du fournisseur est obligatoire');
        return;
      }
      await FournisseursAPI.create({
        nom,
        contact: document.getElementById('fContact').value.trim() || null,
        email: document.getElementById('fEmail').value.trim() || null,
        telephone: null,
        adresse: document.getElementById('fAdresse').value.trim() || null,
      });
      renderFournisseurs(el);
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  el.querySelectorAll('[data-del-four]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.delFour;
      if (!confirm('Supprimer ce fournisseur ?')) return;
      try {
        await FournisseursAPI.remove(id);
        renderFournisseurs(el);
      } catch (e) {
        alert(e.message || String(e));
      }
    });
  });
}
