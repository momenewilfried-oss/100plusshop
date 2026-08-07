async function renderClients(el) {
  const clients = await ClientsAPI.list();

  el.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" id="btnNewClient">+ Nouveau client</button>
      <button class="btn" id="btnRefreshClients">Actualiser</button>
    </div>
    <div class="panel" id="clientFormPanel" style="display:none">
      <div class="panel-title">Nouveau client</div>
      <div class="form-grid">
        <div><label>Nom</label><input id="cNom" /></div>
        <div><label>Prénom</label><input id="cPrenom" /></div>
        <div><label>Téléphone</label><input id="cTel" /></div>
        <div><label>Email</label><input id="cEmail" type="email" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary" id="btnSaveClient">Enregistrer</button>
        <button class="btn" id="btnCancelClient">Annuler</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Clients (${clients.length})</div>
      ${clients.length === 0
        ? '<div class="empty">Aucun client</div>'
        : `<table class="data">
            <thead><tr><th>ID</th><th>Nom</th><th>Email</th><th>Téléphone</th><th>Créé le</th></tr></thead>
            <tbody>
              ${clients.map(c => `
                <tr>
                  <td>${c.id_client}</td>
                  <td><strong>${escapeHtml(c.prenom || '')} ${escapeHtml(c.nom || '')}</strong></td>
                  <td>${escapeHtml(c.email || '-')}</td>
                  <td>${escapeHtml(c.telephone || '-')}</td>
                  <td>${c.date_creation ? new Date(c.date_creation).toLocaleDateString('fr-FR') : '-'}</td>
                </tr>`).join('')}
            </tbody>
          </table>`}
    </div>
  `;

  document.getElementById('btnRefreshClients')?.addEventListener('click', () => renderClients(el));
  document.getElementById('btnNewClient')?.addEventListener('click', () => {
    document.getElementById('clientFormPanel').style.display = 'block';
  });
  document.getElementById('btnCancelClient')?.addEventListener('click', () => {
    document.getElementById('clientFormPanel').style.display = 'none';
  });
  document.getElementById('btnSaveClient')?.addEventListener('click', async () => {
    try {
      await ClientsAPI.create({
        nom: document.getElementById('cNom').value.trim(),
        prenom: document.getElementById('cPrenom').value.trim(),
        telephone: document.getElementById('cTel').value.trim(),
        email: document.getElementById('cEmail').value.trim(),
      });
      renderClients(el);
    } catch (e) {
      alert(e.message);
    }
  });
}