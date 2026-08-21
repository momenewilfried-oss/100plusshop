async function renderPOS(el) {
  let panier = [];
  let clients = [];
  let produits = [];
  let selectedClient = '';

  try {
    [clients, produits] = await Promise.all([
      ClientsAPI.list(),
      ProduitsAPI.list(),
    ]);
  } catch (e) {
    el.innerHTML = `<div class="error-box">${e.message}</div>`;
    return;
  }

  async function chargerVariantes(idProduit) {
    try {
      const p = await ProduitsAPI.get(idProduit);
      return p.variantes || p.details || [];
    } catch (err) {
      console.error('chargerVariantes', idProduit, err);
      throw err;
    }
  }

  function totalPanier() {
    return panier.reduce((s, l) => s + l.prixUnitaire * l.quantite - (l.remise || 0), 0);
  }

  function render() {
    const total = totalPanier();
    // helper to build client options with optional filter
    function clientOptionsHtml(q = '') {
      const qq = (q || '').toLowerCase();
      function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      const opts = clients
        .filter(c => {
          const txt = `${c.prenom || ''} ${c.nom || ''}`.toLowerCase();
          return !qq || txt.includes(qq);
        })
        .map(c => `
          <option value="${c.id_client}" ${String(c.id_client) === String(selectedClient) ? 'selected' : ''}>
            ${esc(c.prenom)} ${esc(c.nom)}
          </option>`)
        .join('');
      // If there is an active query, show it as the first option and hide the default "Anonyme"
      if (qq) {
        return `<option value="">${esc(q)}</option>` + opts;
      }
      return `<option value="">— Anonyme —</option>` + opts;
    }

    el.innerHTML = `
      <div class="grid-2">
        <!-- Catalogue -->
        <div class="panel">
          <div class="panel-title">Catalogue</div>
          <input type="search" id="posSearch" placeholder="Rechercher…" style="width:100%;margin-bottom:12px;height:36px;padding:0 12px;border:1px solid var(--border);border-radius:8px;" />
          <div id="posCatalogue" style="max-height:420px;overflow:auto;">
            ${produits.length === 0
              ? '<div class="empty">Aucun produit</div>'
              : produits.map(p => `
                <div class="alert-item" data-prod="${p.id_produit || p.id}" data-nom="${(p.nom || '').replace(/"/g, '')}" data-search="${(p.nom + ' ' + (p.reference || '')).toLowerCase()}">
                  <div>
                    <div class="name">${escapeHtml(p.nom || '-')}</div>
                    <div class="meta">${escapeHtml(p.reference || '')} · ${formatMontant(p.prix_vente)}</div>
                  </div>
                  <button class="btn btn-sm btn-primary" data-add-prod="${p.id_produit || p.id}">Choisir</button>
                </div>
              `).join('')}
          </div>
        </div>

        <!-- Panier -->
        <div class="panel">
          <div class="panel-title">Panier</div>
          ${panier.length === 0
            ? '<div class="empty">Panier vide</div>'
            : `
              <table class="data">
                <thead><tr><th>Article</th><th>Qté</th><th>P.U.</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  ${panier.map((l, i) => `
                    <tr>
                      <td>
                        <strong>${l.nom}</strong><br>
                        <span style="font-size:11px;color:var(--muted)">${l.taille || ''} ${l.couleur || ''}</span>
                      </td>
                      <td>
                        <input type="number" min="1" value="${l.quantite}" data-qte="${i}"
                          style="width:56px;height:28px;padding:0 6px;border:1px solid var(--border);border-radius:6px;" />
                      </td>
                      <td>${formatMontant(l.prixUnitaire)}</td>
                      <td><strong>${formatMontant(l.prixUnitaire * l.quantite)}</strong></td>
                      <td><button class="btn btn-sm" data-rm="${i}">✕</button></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div style="margin-top:16px;text-align:right;">
                <div style="font-size:13px;color:var(--muted);">Total</div>
                <div style="font-size:24px;font-weight:700;color:var(--primary);">${formatMontant(total)}</div>
              </div>
            `}

          <div class="form-grid" style="margin-top:16px;">
            <div>
              <label>Client enregistré (optionnel)</label>
              <input type="search" id="posClientSearch" placeholder="Rechercher un client en base…"
                style="width:100%;margin-bottom:6px;height:32px;padding:0 8px;border:1px solid var(--border);border-radius:6px;" />
              <select id="posClient">
                ${clientOptionsHtml()}
              </select>
              <label style="margin-top:8px;display:block">Ou nom libre (sans fiche client)</label>
              <input type="text" id="posClientLibre" placeholder="Nom du client (non enregistré)"
                maxlength="200"
                style="width:100%;margin-top:4px;height:32px;padding:0 8px;border:1px solid var(--border);border-radius:6px;" />
              <div style="font-size:11px;color:var(--muted,#888);margin-top:4px">Si vous choisissez un client en liste, le nom libre est ignoré. Aucune fiche client n'est créée.</div>
            </div>
            <div>
              <label>Paiement</label>
              <select id="posPay">
                <option value="carte">Espèces</option>
                <option value="especes">carte</option>
                <option value="virement">Virement</option>
              </select>
            </div>
          </div>

          <button class="btn btn-primary" id="btnPayer"
            style="width:100%;margin-top:14px;height:44px;"
            ${panier.length === 0 ? 'disabled' : ''}>
            Valider la vente · ${formatMontant(total)}
          </button>
        </div>
      </div>

      <!-- Modal variantes -->
      <div id="posModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;align-items:center;justify-content:center;">
        <div class="panel" style="width:min(420px,92vw);margin:0;">
          <div class="panel-title" id="posModalTitle">Choisir une variante</div>
          <div id="posModalBody"></div>
          <button class="btn" id="posModalClose" style="margin-top:12px;width:100%;">Fermer</button>
        </div>
      </div>
    `;

    // Recherche
    document.getElementById('posSearch')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#posCatalogue [data-search]').forEach((row) => {
        row.style.display = row.dataset.search.includes(q) ? '' : 'none';
      });
    });

    // Ouvrir variantes
    el.querySelectorAll('[data-add-prod]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idProduit = Number(btn.dataset.addProd);
        const nom = btn.closest('[data-nom]')?.dataset.nom || 'Produit';
        const modal = document.getElementById('posModal');
        const body = document.getElementById('posModalBody');
        document.getElementById('posModalTitle').textContent = nom;

        body.innerHTML = '<div class="loading-state">Chargement…</div>';
        modal.style.display = 'flex';

        const variantes = await chargerVariantes(idProduit);

        if (!variantes.length) {
          body.innerHTML = `
            <div class="empty">Aucune variante trouvée pour ce produit.</div>
            <p style="font-size:12px;color:var(--muted);margin-top:8px;">
              Vérifie que GET /api/produits/${idProduit} renvoie un tableau <code>variantes</code>.
            </p>`;
          return;
        }

        body.innerHTML = variantes.map(v => `
          <div class="alert-item">
            <div>
              <div class="name">${v.taille || '-'} / ${v.couleur || '-'}</div>
              <div class="meta">Stock: ${v.stock ?? 0} · ${formatMontant(v.prix_vente)}</div>
            </div>
            <button class="btn btn-sm btn-primary"
              data-pick="${v.id_variante}"
              data-prix="${v.prix_vente || 0}"
              data-taille="${v.taille || ''}"
              data-couleur="${v.couleur || ''}"
              data-nom="${nom}"
              ${Number(v.stock) <= 0 ? 'disabled' : ''}>
              ${Number(v.stock) <= 0 ? 'Rupture' : 'Ajouter'}
            </button>
          </div>
        `).join('');

        body.querySelectorAll('[data-pick]').forEach((b) => {
          b.addEventListener('click', () => {
            const idVariante = Number(b.dataset.pick);
            const existing = panier.find(x => x.idVariante === idVariante);
            if (existing) existing.quantite += 1;
            else {
              panier.push({
                idVariante,
                quantite: 1,
                prixUnitaire: Number(b.dataset.prix),
                remise: 0,
                nom: b.dataset.nom,
                taille: b.dataset.taille,
                couleur: b.dataset.couleur,
              });
            }
            modal.style.display = 'none';
            render();
          });
        });
      });
    });

    document.getElementById('posModalClose')?.addEventListener('click', () => {
      document.getElementById('posModal').style.display = 'none';
    });

    // Track selected client and filter options reliably by rebuilding the select
    selectedClient = document.getElementById('posClient')?.value || '';
    document.getElementById('posClient')?.addEventListener('change', (e) => {
      selectedClient = e.target.value;
      if (selectedClient && document.getElementById('posClientLibre')) {
        document.getElementById('posClientLibre').value = '';
      }
    });

    document.getElementById('posClientSearch')?.addEventListener('input', (e) => {
      const q = (e.target.value || '').trim();
      const sel = document.getElementById('posClient');
      if (!sel) return;
      const qq = q.toLowerCase();
      // build options
      sel.innerHTML = clientOptionsHtml(q);

      if (!qq) {
        sel.value = selectedClient || '';
        return;
      }

      // Find exact match (prenom + nom) or single match
      const matches = clients.filter(c => (`${c.prenom || ''} ${c.nom || ''}`).toLowerCase().includes(qq));
      const exact = clients.find(c => (`${c.prenom || ''} ${c.nom || ''}`).toLowerCase() === qq);
      if (exact) {
        selectedClient = exact.id_client;
        sel.value = String(selectedClient);
      } else if (matches.length >= 1) {
        // Auto-select the first partial match so user doesn't need to manually pick
        selectedClient = matches[0].id_client;
        sel.value = String(selectedClient);
      } else {
        // keep the typed query as first option (already done) and don't change selection
      }
    });

    el.querySelectorAll('[data-rm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        panier.splice(Number(btn.dataset.rm), 1);
        render();
      });
    });

    el.querySelectorAll('[data-qte]').forEach((input) => {
      input.addEventListener('change', () => {
        const i = Number(input.dataset.qte);
        const q = Math.max(1, Number(input.value) || 1);
        panier[i].quantite = q;
        render();
      });
    });

    document.getElementById('btnPayer')?.addEventListener('click', async () => {
      if (!panier.length) return;
      try {
        const idClient = document.getElementById('posClient').value;
        const clientLibre = (document.getElementById('posClientLibre')?.value || '').trim();
        const vente = await VentesAPI.create({
          idClient: idClient ? Number(idClient) : null,
          clientLibre: idClient ? null : (clientLibre || null),
          remiseGlobale: 0,
          modePaiementPrincipal: document.getElementById('posPay').value,
          lignes: panier.map(({ idVariante, quantite, prixUnitaire, remise }) => ({
            idVariante,
            quantite,
            prixUnitaire,
            remise: remise || 0,
          })),
        });
        const idVente = Number(vente.id_vente || vente.id);
        alert(`Vente #${idVente} enregistrée — ${formatMontant(vente.montant_total)}`);

        // Facture : déjà créée par le backend si possible, sinon création front + PDF
        try {
          let facture = vente.facture || null;
          if (!facture && idVente) {
            facture = await FacturesAPI.create({ idVente, statut: 'Payée' });
          }
          const idFact = facture && (facture.id_facture || facture.id || facture.idFacture);
          if (idFact) {
            await FacturesAPI.pdf(idFact);
          } else {
            console.warn('Facture sans id', facture);
            alert('Vente enregistrée. Facture non disponible pour le PDF.');
          }
        } catch (e) {
          console.warn('Erreur création/téléchargement facture', e);
          alert('Vente enregistrée mais la création/téléchargement de la facture a échoué : ' + e.message);
        }

        panier = [];
        render();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  render();
}
