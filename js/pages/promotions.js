async function renderPromotions(el) {
  let list = [];
  try {
    list = await PromotionsAPI.list();
  } catch (e) {
    el.innerHTML = `<div class="error-box">${e.message}</div>`;
    return;
  }

  el.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" id="btnNewPromo">+ Promotion</button>
      <button class="btn" id="btnRefreshPromo">Actualiser</button>
    </div>
    <div class="panel" id="promoForm" style="display:none">
      <div class="panel-title">Nouvelle promotion</div>
      <div class="form-grid">
        <div><label>Nom</label><input id="pNom" placeholder="Soldes été" /></div>
        <div>
          <label>Type</label>
          <select id="pType">
            <option value="pourcentage">Pourcentage</option>
            <option value="montant">Montant fixe</option>
          </select>
        </div>
        <div><label>Valeur</label><input id="pVal" type="number" min="0" step="0.01" placeholder="10" /></div>
        <div><label>Statut</label>
          <select id="pStatut">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div><label>Début</label><input id="pDebut" type="datetime-local" /></div>
        <div><label>Fin</label><input id="pFin" type="datetime-local" /></div>
        <div style="grid-column:1/-1">
          <label>IDs variantes (séparés par virgule)</label>
          <input id="pVars" placeholder="2,3,4" />
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary" id="btnSavePromo">Enregistrer</button>
        <button class="btn" id="btnCancelPromo">Annuler</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">Promotions (${list.length})</div>
      ${list.length === 0
        ? '<div class="empty">Aucune promotion</div>'
        : `<table class="data">
            <thead><tr><th>Nom</th><th>Type</th><th>Valeur</th><th>Période</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              ${list.map(p => `
                <tr>
                  <td><strong>${escapeHtml(p.nom || '')}</strong></td>
                  <td>${escapeHtml(p.type || '')}</td>
                  <td>${p.type === 'pourcentage' ? p.valeur + ' %' : formatMontant(p.valeur)}</td>
                  <td style="font-size:12px">
                    ${(p.date_debut || p.dateDebut) ? new Date(p.date_debut || p.dateDebut).toLocaleDateString('fr-FR') : '-'}
                    →
                    ${(p.date_fin || p.dateFin) ? new Date(p.date_fin || p.dateFin).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td><span class="badge ${p.statut === 'active' ? 'green' : 'gray'}">${escapeHtml(p.statut || '')}</span></td>
                  <td><button class="btn btn-sm" data-del="${p.id_promotion || p.idPromotion}">Suppr.</button></td>
                </tr>`).join('')}
            </tbody>
          </table>`}
    </div>
  `;

  document.getElementById('btnRefreshPromo')?.addEventListener('click', () => renderPromotions(el));
  document.getElementById('btnNewPromo')?.addEventListener('click', () => {
    document.getElementById('promoForm').style.display = 'block';
  });
  document.getElementById('btnCancelPromo')?.addEventListener('click', () => {
    document.getElementById('promoForm').style.display = 'none';
  });
  document.getElementById('btnSavePromo')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnSavePromo');
    if (btn && btn.dataset.busy === '1') return;
    if (btn) { btn.dataset.busy = '1'; btn.disabled = true; }
    const idempotencyKey =
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'pro-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    try {
      const vars = document.getElementById('pVars').value
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => n > 0);
      const debut = document.getElementById('pDebut').value;
      const fin = document.getElementById('pFin').value;
      await PromotionsAPI.create({
        idempotencyKey,
        nom: document.getElementById('pNom').value.trim(),
        type: document.getElementById('pType').value,
        valeur: Number(document.getElementById('pVal').value),
        statut: document.getElementById('pStatut').value,
        dateDebut: debut ? debut.replace('T', ' ') + (debut.length === 16 ? ':00' : '') : undefined,
        dateFin: fin ? fin.replace('T', ' ') + (fin.length === 16 ? ':00' : '') : undefined,
        variantes: vars,
      });
      renderPromotions(el);
    } catch (e) {
      alert(e.message);
    } finally {
      setTimeout(() => {
        if (btn) { btn.dataset.busy = '0'; btn.disabled = false; }
      }, 2000);
    }
  });
  el.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette promotion ?')) return;
      try {
        await PromotionsAPI.remove(btn.dataset.del);
        renderPromotions(el);
      } catch (e) {
        alert(e.message);
      }
    });
  });
}
