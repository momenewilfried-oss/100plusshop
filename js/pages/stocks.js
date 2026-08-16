async function renderStocks(el, page = 1) {
  const PAGE_SIZE = 15;
  const currentPage = Math.max(1, Number(page) || 1);

  const [resume, alertes, mouvementsRes, produits] = await Promise.all([
    StocksAPI.resume(),
    StocksAPI.alertes(),
    StocksAPI.mouvements({ page: currentPage, limit: PAGE_SIZE }),
    ProduitsAPI.list(),
  ]);

  // Compat : ancien format (tableau) ou nouveau format paginé { data, total, page, totalPages }
  const mouvements = Array.isArray(mouvementsRes)
    ? mouvementsRes
    : (mouvementsRes.data || []);
  const total = Array.isArray(mouvementsRes)
    ? mouvements.length
    : Number(mouvementsRes.total || 0);
  const totalPages = Array.isArray(mouvementsRes)
    ? 1
    : Math.max(1, Number(mouvementsRes.totalPages || 1));
  const activePage = Array.isArray(mouvementsRes)
    ? 1
    : Math.max(1, Number(mouvementsRes.page || currentPage));

  function paginationHtml() {
    if (total === 0) return '';
    const prevDisabled = activePage <= 1 ? 'disabled' : '';
    const nextDisabled = activePage >= totalPages ? 'disabled' : '';
    // Boutons de pages (fenêtre de 5 autour de la page active)
    const windowSize = 5;
    let start = Math.max(1, activePage - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const pageButtons = [];
    for (let i = start; i <= end; i++) {
      pageButtons.push(
        `<button class="btn btn-sm ${i === activePage ? 'btn-primary' : ''}" data-page="${i}" ${i === activePage ? 'disabled' : ''}>${i}</button>`
      );
    }
    return `
      <div class="pagination" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:12px;">
        <div style="font-size:13px;color:var(--muted);">
          ${total} mouvement${total > 1 ? 's' : ''} · page ${activePage}/${totalPages}
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <button class="btn btn-sm" data-page="${activePage - 1}" ${prevDisabled}>← Préc.</button>
          ${pageButtons.join('')}
          <button class="btn btn-sm" data-page="${activePage + 1}" ${nextDisabled}>Suiv. →</button>
        </div>
      </div>`;
  }

  el.innerHTML = `
    <div class="cards-row">
      <div class="stat-card">
        <div class="label">Total articles</div>
        <div class="value">${resume.total_articles ?? 0}</div>
      </div>
      <div class="stat-card">
        <div class="label">Entrées (30j)</div>
        <div class="value">${resume.entrees_30j ?? 0}</div>
        <div class="delta up">↗</div>
      </div>
      <div class="stat-card">
        <div class="label">Sorties (30j)</div>
        <div class="value">${resume.sorties_30j ?? 0}</div>
      </div>
      <div class="stat-card">
        <div class="label">Alertes stock</div>
        <div class="value">${resume.nb_alertes ?? 0}</div>
        <div class="delta down">à traiter</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-title">Alertes de réapprovisionnement</div>
        ${alertes.length === 0
          ? '<div class="empty">Aucune alerte</div>'
          : alertes.map(a => `
            <div class="alert-item">
              <div>
                <div class="name">${a.produit_nom}</div>
                <div class="meta">${a.reference} · ${a.taille || ''} ${a.couleur || ''} · Stock: ${a.stock}/${a.seuil_alerte}</div>
              </div>
              <span class="badge ${a.niveau === 'Critique' ? 'red' : 'orange'}">${a.niveau || 'Attention'}</span>
            </div>`).join('')}
      </div>
      <div class="panel">
        <div class="panel-title">Nouvelle entrée stock</div>
        <div class="form-grid">
          <div style="grid-column:1/3">
            <label>Rechercher produit / variante</label>
            <div style="display:flex;gap:8px;align-items:center;">
              <input id="mSearch" type="search" placeholder="Tapez le nom du produit ou l'ID variante…" style="flex:1;" />
              <button id="mSearchBtn" class="btn">Entrer</button>
            </div>
            <div id="mVarChoices" style="margin-top:6px;"></div>
          </div>
          <div><label>ID Variante</label><input id="mVar" type="number" /></div>
          <div>
            <label>Type</label>
            <select id="mType">
              <option value="entree">Entrée</option>
              <option value="sortie">Sortie</option>
              <option value="ajustement">Ajustement</option>
            </select>
          </div>
          <div><label>Quantité</label><input id="mQte" type="number" min="1" /></div>
          <div><label>Motif</label><input id="mMotif" placeholder="Livraison fournisseur" /></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn btn-primary" id="btnMouv" style="flex:1">Enregistrer</button>
          <button class="btn" id="btnMouvCancel">Annuler</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Journal des mouvements</div>
      ${mouvements.length === 0
        ? '<div class="empty">Aucun mouvement</div>'
        : `<div class="table-wrap"><table class="data">
            <thead><tr><th>ID</th><th>Article</th><th>Type</th><th>Qté</th><th>Motif</th><th>Date</th></tr></thead>
            <tbody>
              ${mouvements.map(m => `
                <tr>
                  <td>${m.idMouvement}</td>
                  <td>${m.produit_nom || '-'} <span style="color:var(--muted);font-size:12px">${m.taille || ''} ${m.couleur || ''}</span></td>
                  <td><span class="badge ${m.typeMouvement === 'entree' ? 'green' : m.typeMouvement === 'sortie' ? 'pink' : 'orange'}">${m.typeMouvement}</span></td>
                  <td>${m.typeMouvement === 'sortie' ? '-' : '+'}${m.quantite}</td>
                  <td>${m.motif || '-'}</td>
                  <td>${m.dateMouvement ? new Date(m.dateMouvement).toLocaleString('fr-FR') : '-'}</td>
                </tr>`).join('')}
            </tbody>
          </table></div>
          ${paginationHtml()}`}
    </div>
  `;

  // Pagination clicks
  el.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = Number(btn.dataset.page);
      if (p >= 1 && p <= totalPages) renderStocks(el, p);
    });
  });

  document.getElementById('btnMouv')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnMouv');
    if (btn && btn.dataset.busy === '1') return;
    if (btn) {
      btn.dataset.busy = '1';
      btn.disabled = true;
    }
    const idempotencyKey =
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'stk-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    try {
      await StocksAPI.createMouvement({
        idVariante: Number(document.getElementById('mVar').value),
        typeMouvement: document.getElementById('mType').value,
        quantite: Number(document.getElementById('mQte').value),
        motif: document.getElementById('mMotif').value,
        idempotencyKey,
      });
      renderStocks(el, 1);
    } catch (e) {
      alert(e.message);
    } finally {
      setTimeout(() => {
        if (btn) {
          btn.dataset.busy = '0';
          btn.disabled = false;
        }
      }, 2000);
    }
  });

  const variantes = (produits || []).flatMap(p => (p.variantes || []).map(v => ({
    produitId: p.id_produit || p.id,
    produitNom: p.nom || '',
    varianteId: v.id_variante || v.id || v.idVariante,
    taille: v.taille || '',
    couleur: v.couleur || '',
    reference: p.reference || '',
  })));

  document.getElementById('mSearch')?.addEventListener('input', (e) => {
    const q = (e.target.value || '').toLowerCase().trim();
    if (!q) return;
    const byName = variantes.filter(v => (v.produitNom || '').toLowerCase().includes(q));
    const byId = variantes.filter(v => String(v.varianteId).includes(q));
    const byRef = variantes.filter(v => (v.reference || '').toLowerCase().includes(q));
    const merged = [...new Map([...byId, ...byName, ...byRef].map(v => [String(v.varianteId), v])).values()];
    if (merged.length >= 1) {
      document.getElementById('mVar').value = String(merged[0].varianteId);
    }
  });

  document.getElementById('mSearchBtn')?.addEventListener('click', async () => {
    const q = (document.getElementById('mSearch').value || '').trim();
    if (!q) return alert('Entrez le nom du produit ou l\'ID variante');

    const prodExact = produits.find(p => ((p.nom || '').toLowerCase() === q.toLowerCase()));
    const prodPartial = produits.find(p => ((p.nom || '').toLowerCase().includes(q.toLowerCase())));
    const prod = prodExact || prodPartial;
    if (!prod) return alert('Produit introuvable');

    try {
      const full = await ProduitsAPI.get(prod.id_produit || prod.id);
      const vars = full.variantes || full.details || [];
      if (!vars.length) return alert('Aucune variante trouvée pour ce produit');

      const mVarChoices = document.getElementById('mVarChoices');
      if (vars.length === 1) {
        const vid = vars[0].id_variante || vars[0].id || vars[0].idVariante;
        document.getElementById('mVar').value = String(vid);
        mVarChoices.innerHTML = `<div style="font-size:13px;color:var(--muted)">Variante unique trouvée: ${vars[0].taille || ''} ${vars[0].couleur || ''} (ID ${vid})</div>`;
      } else {
        mVarChoices.innerHTML = `
          <label style="font-size:13px">Variantes trouvées</label>
          <select id="mVarSelect" style="width:100%;margin-top:6px;padding:6px;border:1px solid var(--border);border-radius:6px;">
            ${vars.map(v => `<option value="${v.id_variante || v.id || v.idVariante}">${v.taille || '-'} ${v.couleur || '-'} — ID ${v.id_variante || v.id || v.idVariante}</option>`).join('')}
          </select>
        `;
        const sel = document.getElementById('mVarSelect');
        sel.addEventListener('change', (e) => {
          document.getElementById('mVar').value = e.target.value;
        });
        document.getElementById('mVar').value = sel.value;
      }
    } catch (e) {
      console.error('Erreur fetch variantes', e);
      alert('Impossible de récupérer les variantes : ' + e.message);
    }
  });

  document.getElementById('btnMouvCancel')?.addEventListener('click', () => {
    const mVar = document.getElementById('mVar');
    const mType = document.getElementById('mType');
    const mQte = document.getElementById('mQte');
    const mMotif = document.getElementById('mMotif');
    const mSearch = document.getElementById('mSearch');
    const mVarChoices = document.getElementById('mVarChoices');
    if (mVar) mVar.value = '';
    if (mType) mType.value = 'entree';
    if (mQte) mQte.value = '';
    if (mMotif) mMotif.value = '';
    if (mSearch) mSearch.value = '';
    if (mVarChoices) mVarChoices.innerHTML = '';
  });
}
