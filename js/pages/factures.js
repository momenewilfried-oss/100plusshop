let facturesCache = [];
let facturesPage = 1;
let facturesQuery = '';

async function renderFactures(el) {
  let resume = {};
  try { resume = await FacturesAPI.resume(); } catch (_) {}

  facturesCache = await FacturesAPI.list();
  facturesPage = 1;
  facturesQuery = '';
  paintFactures(el, resume);
}

function facturesFiltered() {
  const q = facturesQuery.toLowerCase();
  if (!q) return facturesCache;
  return facturesCache.filter((f) => {
    const text = [
      f.numero,
      f.client_prenom,
      f.client_nom,
      f.date_facture,
      f.montant_total,
      f.statut,
    ].join(' ').toLowerCase();
    return text.includes(q);
  });
}

function paintFactures(el, resume = {}) {
  const filtered = facturesFiltered();
  const pg = paginateSlice(filtered, facturesPage);
  facturesPage = pg.page;

  el.innerHTML = `
    <div class="cards-row">
      <div class="stat-card">
        <div class="label">Total factures</div>
        <div class="value">${resume.total_factures ?? facturesCache.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Recettes payées (mois)</div>
        <div class="value" style="color:var(--success)">${formatMontant(resume.recettes_payees_mois)}</div>
      </div>
      <div class="stat-card">
        <div class="label">En attente</div>
        <div class="value">${formatMontant(resume.en_attente)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Retards</div>
        <div class="value" style="color:var(--danger)">${formatMontant(resume.retards)}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div class="panel-title" style="margin:0">Factures (${filtered.length})</div>
        <button class="btn" id="btnRefreshFact">Actualiser</button>
        <input type="search" id="facturesSearch" placeholder="Rechercher une facture…" style="margin-left:12px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;" />
      </div>
      ${filtered.length === 0
        ? '<div class="empty">Aucune facture — créez-en depuis l\'historique des ventes</div>'
        : `<table class="data">
            <thead>
              <tr><th>N°</th><th>Client</th><th>Date</th><th>Montant</th><th>Statut</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${pg.items.map(f => `
                <tr>
                  <td><strong style="color:var(--primary)">${f.numero}</strong></td>
                  <td>${f.client_prenom ? f.client_prenom + ' ' + f.client_nom : '-'}</td>
                  <td>${f.date_facture ? new Date(f.date_facture).toLocaleDateString('fr-FR') : '-'}</td>
                  <td><strong>${formatMontant(f.montant_total)}</strong></td>
                  <td><span class="badge ${
                    f.statut === 'Payée' ? 'green' :
                    f.statut === 'Retard' ? 'red' :
                    f.statut === 'En attente' ? 'orange' : 'gray'
                  }">${f.statut}</span></td>
                  <td>
                    ${f.statut === 'Payée' ? `<button class="btn btn-sm" data-pdf="${f.id_facture}">PDF</button>` : ''}
                    <select class="btn btn-sm" data-statut="${f.id_facture}" style="height:30px">
                      <option value="">Statut…</option>
                      <option>Payée</option>
                      <option>En attente</option>
                      <option>Retard</option>
                      <option>Annulée</option>
                    </select>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
          ${paginationHtml(pg)}`}
    </div>
  `;

  const searchEl = document.getElementById('facturesSearch');
  if (searchEl) searchEl.value = facturesQuery;

  document.getElementById('btnRefreshFact')?.addEventListener('click', () => renderFactures(el));

  searchEl?.addEventListener('input', (e) => {
    facturesQuery = e.target.value || '';
    facturesPage = 1;
    paintFactures(el, resume);
  });

  bindPagination(el, (delta) => {
    facturesPage += delta;
    paintFactures(el, resume);
  });

  el.querySelectorAll('[data-pdf]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await FacturesAPI.pdf(btn.dataset.pdf);
      } catch (e) {
        alert(e.message + '\n(Vérifiez que pdfkit est installé et le dossier public/factures existe)');
      }
    });
  });

  el.querySelectorAll('[data-statut]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      if (!sel.value) return;
      try {
        await FacturesAPI.setStatut(sel.dataset.statut, sel.value);
        renderFactures(el);
      } catch (e) {
        alert(e.message);
      }
    });
  });
}
