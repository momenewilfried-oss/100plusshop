async function renderRapports(el) {
  const auj = new Date().toISOString().slice(0, 10);
  const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  el.innerHTML = `
    <div class="toolbar">
      <label style="font-size:12px;font-weight:600">Du</label>
      <input type="date" id="rDebut" value="${debutMois}" />
      <label style="font-size:12px;font-weight:600">Au</label>
      <input type="date" id="rFin" value="${auj}" />
      <button class="btn btn-primary" id="btnLoadRapport">Charger</button>
      <button class="btn" id="btnExportExcel">Export Excel</button>
    </div>
    <div id="rapportBody"><div class="loading-state">Chargement…</div></div>
  `;

  async function load() {
    const body = document.getElementById('rapportBody');
    body.innerHTML = '<div class="loading-state">Chargement…</div>';

    try {
      const debut = document.getElementById('rDebut').value;
      const fin = document.getElementById('rFin').value;
      const data = await RapportsAPI.comptable(debut, fin);

      body.innerHTML = `
        <div class="cards-row">
          <div class="stat-card">
            <div class="label">Recettes</div>
            <div class="value" style="color:var(--success)">${formatMontant(data.recettes)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Dépenses</div>
            <div class="value" style="color:var(--danger)">${formatMontant(data.depenses)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Achats fournisseurs</div>
            <div class="value">${formatMontant(data.achats_fournisseurs)}</div>
          </div>
          <div class="stat-card">
            <div class="label">Bénéfice</div>
            <div class="value" style="color:${
              Number(data.benefice) >= 0 ? 'var(--success)' : 'var(--danger)'
            }">${formatMontant(data.benefice)}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="panel">
            <div class="panel-title">CA par jour</div>
            ${
              (data.ca_par_jour || []).length === 0
                ? '<div class="empty">Pas de données</div>'
                : `<div class="table-wrap"><table class="data">
                    <thead><tr><th>Jour</th><th>CA</th></tr></thead>
                    <tbody>
                      ${data.ca_par_jour
                        .map(
                          (r) => `
                        <tr>
                          <td>${
                            r.jour
                              ? new Date(r.jour).toLocaleDateString('fr-FR')
                              : '-'
                          }</td>
                          <td><strong>${formatMontant(r.ca)}</strong></td>
                        </tr>`
                        )
                        .join('')}
                    </tbody>
                  </table></div>`
            }
          </div>

          <div class="panel">
            <div class="panel-title">Top produits</div>
            ${
              (data.top_produits || []).length === 0
                ? '<div class="empty">Pas de données</div>'
                : `<div class="table-wrap"><table class="data">
                    <thead><tr><th>Produit</th><th>Qté</th><th>CA</th></tr></thead>
                    <tbody>
                      ${data.top_produits
                        .map(
                          (r) => `
                        <tr>
                          <td>
                            <strong>${r.nom || '-'}</strong><br>
                            <span style="font-size:11px;color:var(--muted)">${
                              r.reference || ''
                            }</span>
                          </td>
                          <td>${r.qte}</td>
                          <td><strong>${formatMontant(r.ca)}</strong></td>
                        </tr>`
                        )
                        .join('')}
                    </tbody>
                  </table></div>`
            }
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">Dépenses par catégorie</div>
          ${
            (data.depenses_par_categorie || []).length === 0
              ? '<div class="empty">Aucune dépense</div>'
              : `<div class="table-wrap"><table class="data">
                  <thead><tr><th>Catégorie</th><th>Total</th></tr></thead>
                  <tbody>
                    ${data.depenses_par_categorie
                      .map(
                        (r) => `
                      <tr>
                        <td>${r.categorie || '-'}</td>
                        <td><strong>${formatMontant(r.total)}</strong></td>
                      </tr>`
                      )
                      .join('')}
                  </tbody>
                </table></div>`
          }
        </div>
      `;
    } catch (e) {
      body.innerHTML = `<div class="error-box">${e.message}</div>`;
    }
  }

  document.getElementById('btnLoadRapport')?.addEventListener('click', load);

  document.getElementById('btnExportExcel')?.addEventListener('click', async () => {
    try {
      const debut = document.getElementById('rDebut').value;
      const fin = document.getElementById('rFin').value;
      await RapportsAPI.exportExcel(debut, fin);
    } catch (e) {
      alert(e.message);
    }
  });

  await load();
}