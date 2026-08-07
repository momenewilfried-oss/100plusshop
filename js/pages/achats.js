async function renderAchats(el) {
  let achats = [];
  let fournisseurs = [];
  try {
    [achats, fournisseurs] = await Promise.all([
      AchatsAPI.list(),
      FournisseursAPI.list(),
    ]);
  } catch (e) {
    el.innerHTML = `<div class="error-box">${e.message}</div>`;
    return;
  }

  el.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" id="btnNewAchat">+ Nouvel achat</button>
      <button class="btn" id="btnRefreshAchat">Actualiser</button>
    </div>
    <div class="panel" id="achatForm" style="display:none">
      <div class="panel-title">Achat fournisseur (entrée stock)</div>
      <div class="form-grid">
        <div>
          <label>Fournisseur</label>
          <select id="aFour">
            ${fournisseurs.map(f => `<option value="${f.id_fournisseur}">${f.nom}</option>`).join('')}
          </select>
        </div>
        <div><label>ID Variante</label><input id="aVar" type="number" placeholder="2, 3 ou 4" /></div>
        <div><label>Quantité</label><input id="aQte" type="number" min="1" value="10" /></div>
        <div><label>Prix d'achat unitaire</label><input id="aPrix" type="number" min="0" step="0.01" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary" id="btnSaveAchat">Enregistrer l'achat</button>
        <button class="btn" id="btnCancelAchat">Annuler</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Factures d'achat (${achats.length})</div>
      ${achats.length === 0
        ? '<div class="empty">Aucun achat</div>'
        : `<table class="data">
            <thead><tr><th>N°</th><th>Fournisseur</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>
              ${achats.map(a => `
                <tr>
                  <td><strong style="color:var(--primary)">${a.numero}</strong></td>
                  <td>${a.fournisseur_nom || '-'}</td>
                  <td>${a.date_achat ? new Date(a.date_achat).toLocaleDateString('fr-FR') : '-'}</td>
                  <td><strong>${formatMontant(a.montant_total)}</strong></td>
                  <td><span class="badge green">${a.statut || '-'}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>`}
    </div>
  `;

  document.getElementById('btnRefreshAchat')?.addEventListener('click', () => renderAchats(el));
  document.getElementById('btnNewAchat')?.addEventListener('click', () => {
    document.getElementById('achatForm').style.display = 'block';
  });
  document.getElementById('btnCancelAchat')?.addEventListener('click', () => {
    document.getElementById('achatForm').style.display = 'none';
  });
  document.getElementById('btnSaveAchat')?.addEventListener('click', async () => {
    try {
      await AchatsAPI.create({
        idFournisseur: Number(document.getElementById('aFour').value),
        lignes: [{
          idVariante: Number(document.getElementById('aVar').value),
          quantite: Number(document.getElementById('aQte').value),
          prixUnitaire: Number(document.getElementById('aPrix').value),
        }],
      });
      alert('Achat enregistré — stock mis à jour');
      renderAchats(el);
    } catch (e) {
      alert(e.message);
    }
  });
}
