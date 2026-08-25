async function renderPOS(el) {
  let panier = [];
  let clients = [];
  let produits = [];
  let selectedClient = '';
  /** Verrou global : aucune autre vente tant que vente + facture pas terminées */
  let paiementEnCours = false;

  try {
    [clients, produits] = await Promise.all([
      ClientsAPI.list(),
      ProduitsAPI.list(),
    ]);
  } catch (e) {
    el.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
    return;
  }

  function newIdempotencyKey() {
    if (window.crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return (
      String(Date.now()) +
      '-' +
      Math.random().toString(16).slice(2) +
      '-' +
      Math.random().toString(16).slice(2)
    );
  }

  async function chargerVariantes(idProduit) {
    const p = await ProduitsAPI.get(idProduit);
    return p.variantes || p.details || [];
  }

  function totalPanier() {
    return panier.reduce(
      (s, l) => s + l.prixUnitaire * l.quantite - (l.remise || 0),
      0
    );
  }

  function clientOptionsHtml(q) {
    q = q || '';
    const qq = q.toLowerCase();
    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
    const opts = clients
      .filter(function (c) {
        const txt = ((c.prenom || '') + ' ' + (c.nom || '')).toLowerCase();
        return !qq || txt.indexOf(qq) !== -1;
      })
      .map(function (c) {
        return (
          '<option value="' +
          c.id_client +
          '"' +
          (String(c.id_client) === String(selectedClient) ? ' selected' : '') +
          '>' +
          esc(c.prenom) +
          ' ' +
          esc(c.nom) +
          '</option>'
        );
      })
      .join('');
    if (qq) return '<option value="">' + esc(q) + '</option>' + opts;
    return '<option value="">— Anonyme —</option>' + opts;
  }

  function render() {
    const total = totalPanier();
    const locked = paiementEnCours;

    el.innerHTML =
      '<div class="grid-2">' +
      '<div class="panel">' +
      '<div class="panel-title">Catalogue</div>' +
      '<input type="search" id="posSearch" placeholder="Rechercher…" ' +
      'style="width:100%;margin-bottom:12px;height:36px;padding:0 12px;border:1px solid var(--border);border-radius:8px;" ' +
      (locked ? 'disabled ' : '') +
      '/>' +
      '<div id="posCatalogue" style="max-height:420px;overflow:auto;">' +
      (produits.length === 0
        ? '<div class="empty">Aucun produit</div>'
        : produits
            .map(function (p) {
              const id = p.id_produit || p.id;
              const search = ((p.nom || '') + ' ' + (p.reference || '')).toLowerCase();
              return (
                '<div class="alert-item" data-prod="' +
                id +
                '" data-nom="' +
                String(p.nom || '').replace(/"/g, '') +
                '" data-search="' +
                search.replace(/"/g, '') +
                '">' +
                '<div><div class="name">' +
                escapeHtml(p.nom || '-') +
                '</div>' +
                '<div class="meta">' +
                escapeHtml(p.reference || '') +
                ' · ' +
                formatMontant(p.prix_vente) +
                '</div></div>' +
                '<button class="btn btn-sm btn-primary" data-add-prod="' +
                id +
                '"' +
                (locked ? ' disabled' : '') +
                '>Choisir</button></div>'
              );
            })
            .join('')) +
      '</div></div>' +
      '<div class="panel">' +
      '<div class="panel-title">Panier</div>' +
      (panier.length === 0
        ? '<div class="empty">Panier vide</div>'
        : '<table class="data"><thead><tr><th>Article</th><th>Qté</th><th>P.U.</th><th>Total</th><th></th></tr></thead><tbody>' +
          panier
            .map(function (l, i) {
              return (
                '<tr><td><strong>' +
                escapeHtml(l.nom) +
                '</strong><br><span style="font-size:11px;color:var(--muted)">' +
                escapeHtml(l.taille || '') +
                ' ' +
                escapeHtml(l.couleur || '') +
                '</span></td>' +
                '<td><input type="number" min="1" value="' +
                l.quantite +
                '" data-qte="' +
                i +
                '" style="width:56px;height:28px;padding:0 6px;border:1px solid var(--border);border-radius:6px;"' +
                (locked ? ' disabled' : '') +
                ' /></td>' +
                '<td>' +
                formatMontant(l.prixUnitaire) +
                '</td>' +
                '<td><strong>' +
                formatMontant(l.prixUnitaire * l.quantite - (l.remise || 0)) +
                '</strong></td>' +
                '<td><button class="btn btn-sm" data-rm="' +
                i +
                '"' +
                (locked ? ' disabled' : '') +
                '>✕</button></td></tr>'
              );
            })
            .join('') +
          '</tbody></table>' +
          '<div style="margin-top:16px;text-align:right;">' +
          '<div style="font-size:13px;color:var(--muted);">Total</div>' +
          '<div style="font-size:24px;font-weight:700;color:var(--primary);">' +
          formatMontant(total) +
          '</div></div>') +
      '<div class="form-grid" style="margin-top:16px;">' +
      '<div>' +
      '<label>Client enregistré (optionnel)</label>' +
      '<input type="search" id="posClientSearch" placeholder="Rechercher un client en base…" ' +
      'style="width:100%;margin-bottom:6px;height:32px;padding:0 8px;border:1px solid var(--border);border-radius:6px;"' +
      (locked ? ' disabled' : '') +
      ' />' +
      '<select id="posClient"' +
      (locked ? ' disabled' : '') +
      '>' +
      clientOptionsHtml() +
      '</select>' +
      '<label style="margin-top:8px;display:block">Ou nom libre (sans fiche client)</label>' +
      '<input type="text" id="posClientLibre" placeholder="Nom du client (non enregistré)" maxlength="200" ' +
      'style="width:100%;margin-top:4px;height:32px;padding:0 8px;border:1px solid var(--border);border-radius:6px;"' +
      (locked ? ' disabled' : '') +
      ' />' +
      '<div style="font-size:11px;color:var(--muted,#888);margin-top:4px">Si vous choisissez un client en liste, le nom libre est ignoré.</div>' +
      '</div>' +
      '<div>' +
      '<label>Paiement</label>' +
      '<select id="posPay"' +
      (locked ? ' disabled' : '') +
      '>' +
      '<option value="especes">Espèces</option>' +
      '<option value="carte">Carte</option>' +
      '<option value="virement">Virement</option>' +
      '<option value="mobile">Mobile money</option>' +
      '</select>' +
      '</div></div>' +
      '<button class="btn btn-primary" id="btnPayer" style="width:100%;margin-top:14px;height:44px;"' +
      (panier.length === 0 || locked ? ' disabled' : '') +
      '>' +
      (locked ? 'Traitement en cours…' : 'Valider la vente · ' + formatMontant(total)) +
      '</button>' +
      (locked
        ? '<div style="margin-top:8px;font-size:12px;color:var(--muted);text-align:center;">Veuillez patienter — vente et facture en cours</div>'
        : '') +
      '</div></div>' +
      '<div id="posModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;align-items:center;justify-content:center;">' +
      '<div class="panel" style="width:min(420px,92vw);margin:0;">' +
      '<div class="panel-title" id="posModalTitle">Choisir une variante</div>' +
      '<div id="posModalBody"></div>' +
      '<button class="btn" id="posModalClose" style="margin-top:12px;width:100%;">Fermer</button>' +
      '</div></div>';

<<<<<<< HEAD
    // Recherche catalogue
    document.getElementById('posSearch')?.addEventListener('input', function (e) {
=======
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
>>>>>>> 7c9d518de012eceebf3afaa352155cfeb6bf6493
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#posCatalogue [data-search]').forEach(function (row) {
        row.style.display = row.dataset.search.indexOf(q) !== -1 ? '' : 'none';
      });
    });

    // Variantes
    el.querySelectorAll('[data-add-prod]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (paiementEnCours) return;
        const idProduit = Number(btn.dataset.addProd);
        const nom = btn.closest('[data-nom]')?.dataset.nom || 'Produit';
        const modal = document.getElementById('posModal');
        const body = document.getElementById('posModalBody');
        document.getElementById('posModalTitle').textContent = nom;
        body.innerHTML = '<div class="loading-state">Chargement…</div>';
        modal.style.display = 'flex';

        let variantes;
        try {
          variantes = await chargerVariantes(idProduit);
        } catch (err) {
          body.innerHTML = '<div class="error-box">' + escapeHtml(err.message) + '</div>';
          return;
        }

        if (!variantes.length) {
          body.innerHTML = '<div class="empty">Aucune variante pour ce produit.</div>';
          return;
        }

        body.innerHTML = variantes
          .map(function (v) {
            const stock = Number(v.stock) || 0;
            return (
              '<div class="alert-item"><div>' +
              '<div class="name">' +
              escapeHtml(v.taille || '-') +
              ' / ' +
              escapeHtml(v.couleur || '-') +
              '</div>' +
              '<div class="meta">Stock: ' +
              stock +
              ' · ' +
              formatMontant(v.prix_vente) +
              '</div></div>' +
              '<button class="btn btn-sm btn-primary" data-pick="' +
              v.id_variante +
              '" data-prix="' +
              (v.prix_vente || 0) +
              '" data-taille="' +
              escapeAttr(v.taille || '') +
              '" data-couleur="' +
              escapeAttr(v.couleur || '') +
              '" data-nom="' +
              escapeAttr(nom) +
              '"' +
              (stock <= 0 || paiementEnCours ? ' disabled' : '') +
              '>' +
              (stock <= 0 ? 'Rupture' : 'Ajouter') +
              '</button></div>'
            );
          })
          .join('');

        body.querySelectorAll('[data-pick]').forEach(function (b) {
          b.addEventListener('click', function () {
            if (paiementEnCours) return;
            const idVariante = Number(b.dataset.pick);
            const existing = panier.find(function (x) {
              return x.idVariante === idVariante;
            });
            if (existing) existing.quantite += 1;
            else {
              panier.push({
                idVariante: idVariante,
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

    document.getElementById('posModalClose')?.addEventListener('click', function () {
      document.getElementById('posModal').style.display = 'none';
    });

    selectedClient = document.getElementById('posClient')?.value || selectedClient;
    document.getElementById('posClient')?.addEventListener('change', function (e) {
      selectedClient = e.target.value;
      if (selectedClient && document.getElementById('posClientLibre')) {
        document.getElementById('posClientLibre').value = '';
      }
    });

    document.getElementById('posClientSearch')?.addEventListener('input', function (e) {
      if (paiementEnCours) return;
      const q = (e.target.value || '').trim();
      const sel = document.getElementById('posClient');
      if (!sel) return;
      const qq = q.toLowerCase();
      sel.innerHTML = clientOptionsHtml(q);
      if (!qq) {
        sel.value = selectedClient || '';
        return;
      }
      const matches = clients.filter(function (c) {
        return ((c.prenom || '') + ' ' + (c.nom || '')).toLowerCase().indexOf(qq) !== -1;
      });
      const exact = clients.find(function (c) {
        return ((c.prenom || '') + ' ' + (c.nom || '')).toLowerCase() === qq;
      });
      if (exact) {
        selectedClient = exact.id_client;
        sel.value = String(selectedClient);
      } else if (matches.length >= 1) {
        selectedClient = matches[0].id_client;
        sel.value = String(selectedClient);
      }
    });

    el.querySelectorAll('[data-rm]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (paiementEnCours) return;
        panier.splice(Number(btn.dataset.rm), 1);
        render();
      });
    });

    el.querySelectorAll('[data-qte]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (paiementEnCours) return;
        const i = Number(input.dataset.qte);
        panier[i].quantite = Math.max(1, Number(input.value) || 1);
        render();
      });
    });

    // ——— VALIDATION VENTE (verrou jusqu'à fin facture) ———
    document.getElementById('btnPayer')?.addEventListener('click', async function () {
      if (!panier.length || paiementEnCours) return;

      paiementEnCours = true;
      render(); // bouton "Traitement…", tout désactivé

      const idempotencyKey = newIdempotencyKey();

      try {
<<<<<<< HEAD
        const idClient = document.getElementById('posClient')?.value;
        const clientLibre = (document.getElementById('posClientLibre')?.value || '').trim();

        const vente = await VentesAPI.create({
          idClient: idClient ? Number(idClient) : null,
          clientLibre: idClient ? null : clientLibre || null,
=======
        const idClient = document.getElementById('posClient').value;
        const clientLibre = (document.getElementById('posClientLibre')?.value || '').trim();
        const vente = await VentesAPI.create({
          idClient: idClient ? Number(idClient) : null,
          clientLibre: idClient ? null : (clientLibre || null),
>>>>>>> 7c9d518de012eceebf3afaa352155cfeb6bf6493
          remiseGlobale: 0,
          modePaiementPrincipal: document.getElementById('posPay')?.value || 'especes',
          idempotencyKey: idempotencyKey,
          lignes: panier.map(function (l) {
            return {
              idVariante: l.idVariante,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              remise: l.remise || 0,
            };
          }),
        });

        const idVente = Number(vente.id_vente || vente.id);

        // Facture + PDF dans le même verrou
        try {
          let facture = vente.facture || null;
          if (!facture && idVente) {
            facture = await FacturesAPI.create({ idVente: idVente, statut: 'Payée' });
          }
          const idFact =
            facture && (facture.id_facture || facture.id || facture.idFacture);
          if (idFact) {
            await FacturesAPI.pdf(idFact);
          } else {
            alert('Vente #' + idVente + ' enregistrée. Facture PDF indisponible.');
          }
        } catch (eFact) {
          console.warn(eFact);
          alert(
            'Vente #' +
              idVente +
              ' enregistrée, mais facture : ' +
              (eFact.message || eFact)
          );
        }

        alert(
          (vente.replay ? 'Vente déjà enregistrée' : 'Vente enregistrée') +
            ' #' +
            idVente +
            ' — ' +
            formatMontant(vente.montant_total)
        );

        panier = [];
      } catch (err) {
        alert(err.message || String(err));
      } finally {
        paiementEnCours = false;
        render();
      }
    });
  }

  render();
}
