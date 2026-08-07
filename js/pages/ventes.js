let ventesCache = [];
let ventesPage = 1;
let ventesQuery = '';

async function renderVentes(el) {
  ventesCache = await VentesAPI.list();
  ventesPage = 1;
  ventesQuery = '';
  paintVentes(el);
}

function ventesFiltered() {
  const q = ventesQuery.toLowerCase();
  if (!q) return ventesCache;
  return ventesCache.filter((v) => {
    const text = [
      v.id_vente,
      v.date_vente,
      v.client_prenom,
      v.client_nom,
      v.vendeur_prenom,
      v.vendeur_nom,
      v.mode_paiement_principal,
      v.statut,
      v.montant_total,
    ].join(' ').toLowerCase();
    return text.includes(q);
  });
}

function paintVentes(el) {
  const filtered = ventesFiltered();
  const pg = paginateSlice(filtered, ventesPage);
  ventesPage = pg.page;

  el.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" id="btnRefreshVentes">Actualiser</button>
      <input type="search" id="ventesSearch" placeholder="Rechercher une vente…" style="margin-left:12px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;" />
    </div>
    <div class="panel">
      <div class="panel-title">Transactions (${filtered.length})</div>
      ${filtered.length === 0
        ? '<div class="empty">Aucune vente</div>'
        : `<table class="data">
            <thead>
              <tr>
                <th>Commande</th><th>Date</th><th>Client</th><th>Vendeur</th>
                <th>Paiement</th><th>Statut</th><th>Total</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${pg.items.map(v => `
                <tr>
                  <td><strong style="color:var(--primary)">CMD-${v.id_vente}</strong></td>
                  <td>${v.date_vente ? new Date(v.date_vente).toLocaleString('fr-FR') : '-'}</td>
                  <td>${v.client_prenom ? escapeHtml(v.client_prenom + ' ' + (v.client_nom || '')) : 'Anonyme'}</td>
                  <td>${escapeHtml(v.vendeur_prenom || '')} ${escapeHtml(v.vendeur_nom || '')}</td>
                  <td>${escapeHtml(v.mode_paiement_principal || '-')}</td>
                  <td><span class="badge ${v.statut === 'validee' ? 'green' : v.statut === 'annulee' ? 'red' : 'orange'}">${escapeHtml(v.statut)}</span></td>
                  <td><strong>${formatMontant(v.montant_total)}</strong></td>
                  <td>
                    ${v.statut === 'validee'
                      ? `<button class="btn btn-sm" data-annuler="${v.id_vente}">Annuler</button>
                         <button class="btn btn-sm btn-primary" data-facture="${v.id_vente}">Facturer</button>`
                      : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${paginationHtml(pg)}`}
    </div>
  `;

  const searchEl = document.getElementById('ventesSearch');
  if (searchEl) searchEl.value = ventesQuery;

  document.getElementById('btnRefreshVentes')?.addEventListener('click', () => renderVentes(el));

  searchEl?.addEventListener('input', (e) => {
    ventesQuery = e.target.value || '';
    ventesPage = 1;
    paintVentes(el);
  });

  bindPagination(el, (delta) => {
    ventesPage += delta;
    paintVentes(el);
  });

  el.querySelectorAll('[data-annuler]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Annuler cette vente ?')) return;
      try {
        await VentesAPI.annuler(btn.dataset.annuler);
        renderVentes(el);
      } catch (e) {
        alert(e.message);
      }
    });
  });

  el.querySelectorAll('[data-facture]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await FacturesAPI.create({ idVente: Number(btn.dataset.facture), statut: 'Payée' });
        alert('Facture créée !');
        navigate('factures');
      } catch (e) {
        alert(e.message);
      }
    });
  });
}
