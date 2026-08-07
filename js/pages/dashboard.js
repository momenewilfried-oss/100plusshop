async function renderDashboard(el) {
  try {
    const data = await DashboardAPI.get();

    const ca = formatMontant(data.ca_jour);
    const evoBrut = Number(data.evolution_ca || 0);
    const evo = Math.max(-100, Math.min(100, evoBrut)); // plafond ±100 %
    const evoClass = evo >= 0 ? 'up' : 'down';
    const evoSign = evo >= 0 ? '↗' : '↘';

    const user = getUser();
    const boutique = user
      ? `${user.prenom || ''} ${user.nom || ''}`.trim()
      : 'Boutique';

    el.innerHTML = `
      <div class="hero-banner">
        <div>
          <div style="font-size:11px;opacity:0.7;margin-bottom:8px">MISE À JOUR : AUJOURD'HUI</div>
          <h2>Bonjour, ${boutique} !</h2>
          <p>
            ${
              evo !== 0
                ? `Vos performances aujourd'hui sont en ${
                    evo >= 0 ? 'hausse' : 'baisse'
                  } de <strong style="color:#4ADE80">${Math.abs(evo)}%</strong> par rapport à hier.`
                : 'Bienvenue sur votre tableau de bord.'
            }
            ${
              data.nb_alertes
                ? ` Vous avez <strong>${data.nb_alertes}</strong> alerte(s) de stock.`
                : ''
            }
          </p>
          <div class="hero-actions">
            <button class="btn btn-primary" onclick="navigate('pos')">Lancer le POS</button>
            <button class="btn" style="background:transparent;color:#fff;border-color:rgba(255,255,255,0.3)" onclick="navigate('ventes')">Consulter les ventes</button>
          </div>
        </div>
      </div>

      <div class="cards-row">
        <div class="stat-card">
          <div class="label">CA du jour</div>
          <div class="value">${ca}</div>
          <div class="delta ${evoClass}">${evoSign} ${Math.abs(evo)}% vs hier</div>
        </div>
        <div class="stat-card">
          <div class="label">Commandes</div>
          <div class="value">${data.nb_commandes || 0}</div>
          <div class="delta up">aujourd'hui</div>
        </div>
        <div class="stat-card">
          <div class="label">Stock total</div>
          <div class="value">${Number(data.stock_total || 0).toLocaleString('fr-FR')}</div>
          <div class="delta">unités en rayon</div>
        </div>
        <div class="stat-card">
          <div class="label">Nouveaux clients</div>
          <div class="value">${data.nouveaux_clients || 0}</div>
          <div class="delta">ce mois</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-title">Performance des ventes (7 jours)</div>
          ${
            (data.performance_7j || []).length === 0
              ? '<div class="empty">Pas encore de données</div>'
              : `<table class="data"><thead><tr><th>Jour</th><th>CA</th></tr></thead><tbody>
                ${data.performance_7j
                  .map(
                    (r) => `
                  <tr>
                    <td>${r.jour ? new Date(r.jour).toLocaleDateString('fr-FR') : '-'}</td>
                    <td><strong>${formatMontant(r.ca)}</strong></td>
                  </tr>`
                  )
                  .join('')}
              </tbody></table>`
          }
        </div>
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title" style="margin:0">Alertes stock</div>
            <span class="badge orange">${data.nb_alertes || 0} alertes</span>
          </div>
          ${
            (data.alertes_stock || []).length === 0
              ? '<div class="empty">Aucune alerte</div>'
              : data.alertes_stock
                  .map(
                    (a) => `
              <div class="alert-item">
                <div>
                  <div class="name">${escapeHtml(a.produit_nom || '-')}</div>
                  <div class="meta">${escapeHtml(a.reference || '')} · ${escapeHtml(a.taille || '')} ${escapeHtml(a.couleur || '')} · ${a.stock}/${a.seuil_alerte}</div>
                </div>
                <span class="badge red">STOCK FAIBLE</span>
              </div>`
                  )
                  .join('')
          }
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Dernières ventes</div>
        ${
          (data.dernieres_ventes || []).length === 0
            ? '<div class="empty">Aucune vente</div>'
            : `<table class="data">
              <thead><tr><th>ID</th><th>Date</th><th>Client</th><th>Paiement</th><th>Statut</th><th>Total</th></tr></thead>
              <tbody>
                ${data.dernieres_ventes
                  .map(
                    (v) => `
                  <tr>
                    <td><strong style="color:var(--primary)">#${v.id_vente}</strong></td>
                    <td>${v.date_vente ? new Date(v.date_vente).toLocaleString('fr-FR') : '-'}</td>
                    <td>${escapeHtml(v.client_nom || 'Anonyme')}</td>
                    <td>${escapeHtml(v.mode_paiement_principal || '-')}</td>
                    <td><span class="badge ${v.statut === 'validee' ? 'green' : 'orange'}">${escapeHtml(v.statut)}</span></td>
                    <td><strong>${formatMontant(v.montant_total)}</strong></td>
                  </tr>`
                  )
                  .join('')}
              </tbody>
            </table>`
        }
      </div>
    `;
  } catch (e) {
    el.innerHTML = `<div class="error-box">Erreur tableau de bord : ${e.message}</div>
      <button class="btn" onclick="navigate('dashboard')">Réessayer</button>`;
  }
}