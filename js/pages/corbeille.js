async function renderCorbeille(el) {
  el.innerHTML = '<div class="loading-state">Chargement de la corbeille…</div>';
  let data = { utilisateurs: [], clients: [], produits: [] };
  try {
    data = await CorbeilleAPI.list();
  } catch (e) {
    el.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
    return;
  }

  const u = data.utilisateurs || [];
  const c = data.clients || [];
  const p = data.produits || [];

  el.innerHTML = `
    <div class="panel">
      <div class="panel-title">Corbeille</div>
      <p style="font-size:13px;opacity:.8">Éléments désactivés. Vous pouvez les restaurer.</p>
    </div>

    <div class="panel">
      <div class="panel-title">Utilisateurs (${u.length})</div>
      ${u.length === 0 ? '<div class="empty">Vide</div>' : `
        <table class="data"><thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th></th></tr></thead>
        <tbody>
          ${u.map((x) => `
            <tr>
              <td>${escapeHtml((x.prenom || '') + ' ' + (x.nom || ''))}</td>
              <td>${escapeHtml(x.email || '')}</td>
              <td>${escapeHtml(x.role || '')}</td>
              <td>
                <button class="btn btn-sm btn-primary" data-restore-user="${x.id_utilisateur}">Restaurer</button>
              </td>
            </tr>`).join('')}
        </tbody></table>`}
    </div>

    <div class="panel">
      <div class="panel-title">Clients (${c.length})</div>
      ${c.length === 0 ? '<div class="empty">Vide</div>' : `
        <table class="data"><thead><tr><th>Nom</th><th>Téléphone</th><th>Supprimé le</th><th></th></tr></thead>
        <tbody>
          ${c.map((x) => `
            <tr>
              <td>${escapeHtml((x.prenom || '') + ' ' + (x.nom || ''))}</td>
              <td>${escapeHtml(x.telephone || '')}</td>
              <td>${x.deleted_at ? new Date(x.deleted_at).toLocaleString('fr-FR') : '—'}</td>
              <td>
                <button class="btn btn-sm btn-primary" data-restore-client="${x.id_client}">Restaurer</button>
              </td>
            </tr>`).join('')}
        </tbody></table>`}
    </div>

    <div class="panel">
      <div class="panel-title">Produits (${p.length})</div>
      ${p.length === 0 ? '<div class="empty">Vide</div>' : `
        <table class="data"><thead><tr><th>Réf.</th><th>Nom</th><th>Prix</th><th>Supprimé le</th><th></th></tr></thead>
        <tbody>
          ${p.map((x) => `
            <tr>
              <td>${escapeHtml(x.reference || '')}</td>
              <td>${escapeHtml(x.nom || '')}</td>
              <td>${formatMontant(x.prix_vente)}</td>
              <td>${x.deleted_at ? new Date(x.deleted_at).toLocaleString('fr-FR') : '—'}</td>
              <td>
                <button class="btn btn-sm btn-primary" data-restore-prod="${x.id_produit}">Restaurer</button>
              </td>
            </tr>`).join('')}
        </tbody></table>`}
    </div>
  `;

  el.querySelectorAll('[data-restore-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await CorbeilleAPI.restoreUser(btn.dataset.restoreUser);
        renderCorbeille(el);
      } catch (e) { alert(e.message); }
    });
  });
  el.querySelectorAll('[data-restore-client]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await CorbeilleAPI.restoreClient(btn.dataset.restoreClient);
        renderCorbeille(el);
      } catch (e) { alert(e.message); }
    });
  });
  el.querySelectorAll('[data-restore-prod]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await CorbeilleAPI.restoreProduit(btn.dataset.restoreProd);
        renderCorbeille(el);
      } catch (e) { alert(e.message); }
    });
  });
}
