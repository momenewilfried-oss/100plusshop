async function loadMarqueCategorieSelects(selectedMarque, selectedCat) {
  const selM = document.getElementById('pMarque');
  const selC = document.getElementById('pCat');
  if (!selM || !selC) return;
  let marques = [];
  let cats = [];
  try {
    marques = await MarquesAPI.list();
    if (!Array.isArray(marques)) marques = [];
  } catch (_) {
    marques = [];
  }
  try {
    cats = await CategoriesAPI.list();
    if (!Array.isArray(cats)) cats = [];
  } catch (_) {
    cats = [];
  }
  const sm = selectedMarque != null ? String(selectedMarque) : '';
  const sc = selectedCat != null ? String(selectedCat) : '';
  selM.innerHTML =
    '<option value="">— Choisir —</option>' +
    marques
      .map(
        (m) =>
          `<option value="${m.id_marque}" ${String(m.id_marque) === sm ? 'selected' : ''}>${escapeHtml(
            m.nom || ''
          )}</option>`
      )
      .join('');
  selC.innerHTML =
    '<option value="">— Choisir —</option>' +
    cats
      .map(
        (c) =>
          `<option value="${c.id_categorie}" ${String(c.id_categorie) === sc ? 'selected' : ''}>${escapeHtml(
            c.nom || ''
          )}</option>`
      )
      .join('');
}

async function renderProduits(el) {
  let produits = [];
  try {
    produits = await ProduitsAPI.list();
  } catch (e) {
    el.innerHTML = `<div class="error-box">${e.message}</div>`;
    return;
  }

  const role = (getUser()?.role || '').toLowerCase();
  const peutEcrire = role === 'administrateur' || role === 'gerant';

  el.innerHTML = `
    <div class="toolbar">
      <input type="search" id="prodSearch" placeholder="Rechercher un produit…" style="flex:1;min-width:140px;max-width:280px" />
      ${peutEcrire ? '<button class="btn btn-primary" id="btnNewProd">+ Produit</button>' : ''}
      <button class="btn" id="btnRefreshProd">Actualiser</button>
    </div>

    
    <div class="panel" id="marqueQuickPanel" style="display:none">
      <div class="panel-title">Nouvelle marque</div>
      <div class="form-grid">
        <div><label>Nom *</label><input id="mNom" placeholder="Ex. Nike" /></div>
        <div><label>Description</label><input id="mDesc" /></div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button type="button" class="btn btn-primary" id="btnSaveMarque">Enregistrer marque</button>
        <button type="button" class="btn" id="btnCancelMarque">Annuler</button>
      </div>
    </div>
    <div class="panel" id="catQuickPanel" style="display:none">
      <div class="panel-title">Nouvelle catégorie</div>
      <div class="form-grid">
        <div><label>Nom *</label><input id="cNom" placeholder="Ex. Robes" /></div>
        <div><label>Description</label><input id="cDesc" /></div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button type="button" class="btn btn-primary" id="btnSaveCat">Enregistrer catégorie</button>
        <button type="button" class="btn" id="btnCancelCat">Annuler</button>
      </div>
    </div>

    <div class="panel" id="prodFormPanel" style="display:none">
      <div class="panel-title" id="prodFormTitle">Nouveau produit</div>
      <input type="hidden" id="pId" value="" />
      <div class="form-grid">
        <div><label>Référence *</label><input id="pRef" placeholder="REF-001" /></div>
        <div><label>Nom *</label><input id="pNom" placeholder="Robe Été" /></div>
        <div><label>Prix vente *</label><input id="pPrixV" type="number" min="0" step="0.01" /></div>
        <div><label>Prix achat</label><input id="pPrixA" type="number" min="0" step="0.01" /></div>
        <div>
          <label>Marque</label>
          <div style="display:flex;gap:6px;align-items:center">
            <select id="pMarque" style="flex:1"><option value="">— Choisir —</option></select>
            <button type="button" class="btn btn-sm" id="btnAddMarque" title="Nouvelle marque">+</button>
          </div>
        </div>
        <div>
          <label>Catégorie</label>
          <div style="display:flex;gap:6px;align-items:center">
            <select id="pCat" style="flex:1"><option value="">— Choisir —</option></select>
            <button type="button" class="btn btn-sm" id="btnAddCat" title="Nouvelle catégorie">+</button>
          </div>
        </div>
        <div><label>ID Fournisseur</label><input id="pFour" type="number" value="1" /></div>
        <div><label>Seuil alerte</label><input id="pSeuil" type="number" value="5" /></div>
        <div><label>Matière</label><input id="pMat" /></div>
        <div><label>Genre</label><input id="pGenre" placeholder="Femme" /></div>
        <div><label>Saison</label><input id="pSaison" placeholder="Été" /></div>
        <div><label>Description</label><input id="pDesc" /></div>
      </div>
      <div id="varCreateBlock">
        <div class="panel-title" style="margin-top:16px">Première variante (optionnel)</div>
        <div class="form-grid">
          <div><label>Taille</label><input id="vTaille" placeholder="M" /></div>
          <div><label>Couleur</label><input id="vCouleur" placeholder="Rouge" /></div>
          <div><label>Stock</label><input id="vStock" type="number" value="0" /></div>
          <div><label>Prix vente variante</label><input id="vPrixV" type="number" step="0.01" /></div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btnSaveProd">Enregistrer</button>
        <button class="btn" id="btnCancelProd">Annuler</button>
      </div>
    </div>

    <div class="panel" id="varFormPanel" style="display:none">
      <div class="panel-title">Ajouter une variante — <span id="varProdName"></span></div>
      <input type="hidden" id="varProdId" />
      <div class="form-grid">
        <div><label>Taille</label><input id="nvTaille" placeholder="L" /></div>
        <div><label>Couleur</label><input id="nvCouleur" placeholder="Noir" /></div>
        <div><label>Stock</label><input id="nvStock" type="number" value="0" /></div>
        <div><label>Prix vente</label><input id="nvPrixV" type="number" step="0.01" /></div>
        <div><label>Prix achat</label><input id="nvPrixA" type="number" step="0.01" /></div>
        <div><label>Seuil alerte</label><input id="nvSeuil" type="number" value="5" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btnSaveVar">Ajouter la variante</button>
        <button class="btn" id="btnCancelVar">Annuler</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Catalogue (${produits.length})</div>
      ${produits.length === 0
        ? '<div class="empty">Aucun produit</div>'
        : `<div class="table-wrap"><table class="data" id="prodTable">
            <thead>
              <tr>
                <th>Référence</th><th>Produit</th><th>Prix vente</th>
                <th>Stock</th><th>Catégorie</th><th>Marque</th>
                ${peutEcrire ? '<th>Actions</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${produits.map(p => `
                <tr data-search="${((p.nom || '') + ' ' + (p.reference || '')).toLowerCase()}">
                  <td><code>${escapeHtml(p.reference || '-')}</code></td>
                  <td><strong>${escapeHtml(p.nom || '-')}</strong></td>
                  <td>${formatMontant(p.prix_vente)}</td>
                  <td>${p.stock_total ?? '-'}</td>
                  <td>${escapeHtml(p.categorie_nom || '-')}</td>
                  <td>${escapeHtml(p.marque_nom || '-')}</td>
                  ${peutEcrire ? `
                  <td>
                    <button class="btn btn-sm btn-primary"
                      data-edit="${p.id_produit}"
                      data-ref="${(p.reference || '').replace(/"/g, '')}"
                      data-nom="${(p.nom || '').replace(/"/g, '')}"
                      data-desc="${(p.description || '').replace(/"/g, '')}"
                      data-pv="${p.prix_vente ?? ''}"
                      data-pa="${p.prix_achat ?? ''}"
                      data-seuil="${p.seuil_alerte ?? 5}"
                      data-mat="${(p.matiere || '').replace(/"/g, '')}"
                      data-genre="${(p.genre || '').replace(/"/g, '')}"
                      data-saison="${(p.saison || '').replace(/"/g, '')}">
                      Modifier
                    </button>
                    <button class="btn btn-sm" data-var="${p.id_produit}" data-nom="${(p.nom || '').replace(/"/g, '')}">+ Variante</button>
                  </td>` : ''}
                </tr>`).join('')}
            </tbody>
          </table></div>`}
    </div>
  `;

  
  if (peutEcrire) {
    loadMarqueCategorieSelects().catch(function () {});
  }

  document.getElementById('btnAddMarque')?.addEventListener('click', function () {
    document.getElementById('marqueQuickPanel').style.display = 'block';
    document.getElementById('catQuickPanel').style.display = 'none';
  });
  document.getElementById('btnCancelMarque')?.addEventListener('click', function () {
    document.getElementById('marqueQuickPanel').style.display = 'none';
  });
  document.getElementById('btnSaveMarque')?.addEventListener('click', async function () {
    try {
      const nom = document.getElementById('mNom').value.trim();
      if (!nom) return alert('Nom de marque obligatoire');
      const row = await MarquesAPI.create({
        nom: nom,
        description: document.getElementById('mDesc').value.trim() || null,
      });
      document.getElementById('marqueQuickPanel').style.display = 'none';
      document.getElementById('mNom').value = '';
      document.getElementById('mDesc').value = '';
      await loadMarqueCategorieSelects(row.id_marque, document.getElementById('pCat').value);
      document.getElementById('prodFormPanel').style.display = 'block';
      alert('Marque créée');
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('btnAddCat')?.addEventListener('click', function () {
    document.getElementById('catQuickPanel').style.display = 'block';
    document.getElementById('marqueQuickPanel').style.display = 'none';
  });
  document.getElementById('btnCancelCat')?.addEventListener('click', function () {
    document.getElementById('catQuickPanel').style.display = 'none';
  });
  document.getElementById('btnSaveCat')?.addEventListener('click', async function () {
    try {
      const nom = document.getElementById('cNom').value.trim();
      if (!nom) return alert('Nom de catégorie obligatoire');
      const row = await CategoriesAPI.create({
        nom: nom,
        description: document.getElementById('cDesc').value.trim() || null,
      });
      document.getElementById('catQuickPanel').style.display = 'none';
      document.getElementById('cNom').value = '';
      document.getElementById('cDesc').value = '';
      await loadMarqueCategorieSelects(document.getElementById('pMarque').value, row.id_categorie);
      document.getElementById('prodFormPanel').style.display = 'block';
      alert('Catégorie créée');
    } catch (e) {
      alert(e.message);
    }
  });

document.getElementById('btnRefreshProd')?.addEventListener('click', () => renderProduits(el));
  document.getElementById('prodSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#prodTable tbody tr').forEach((tr) => {
      tr.style.display = (tr.dataset.search || '').includes(q) ? '' : 'none';
    });
  });

  function resetProdForm() {
    document.getElementById('pId').value = '';
    document.getElementById('prodFormTitle').textContent = 'Nouveau produit';
    document.getElementById('pRef').value = '';
    document.getElementById('pRef').disabled = false;
    document.getElementById('pNom').value = '';
    document.getElementById('pDesc').value = '';
    document.getElementById('pPrixV').value = '';
    document.getElementById('pPrixA').value = '';
    document.getElementById('pSeuil').value = '5';
    document.getElementById('pMat').value = '';
    document.getElementById('pGenre').value = '';
    document.getElementById('pSaison').value = '';
    document.getElementById('varCreateBlock').style.display = 'block';
  }

  document.getElementById('btnNewProd')?.addEventListener('click', () => {
    resetProdForm();
    document.getElementById('prodFormPanel').style.display = 'block';
    document.getElementById('varFormPanel').style.display = 'none';
  });

  document.getElementById('btnCancelProd')?.addEventListener('click', () => {
    document.getElementById('prodFormPanel').style.display = 'none';
  });

  document.getElementById('btnSaveProd')?.addEventListener('click', async () => {
    try {
      const id = document.getElementById('pId').value;
      if (id) {
        // Modification
        await ProduitsAPI.update(id, {
          nom: document.getElementById('pNom').value.trim(),
          description: document.getElementById('pDesc').value.trim() || null,
          prixAchat: Number(document.getElementById('pPrixA').value) || null,
          prixVente: Number(document.getElementById('pPrixV').value),
          seuilAlerte: Number(document.getElementById('pSeuil').value) || 5,
        });
        alert('Produit modifié');
      } else {
        const body = {
          reference: document.getElementById('pRef').value.trim(),
          nom: document.getElementById('pNom').value.trim(),
          description: document.getElementById('pDesc').value.trim() || null,
          idMarque: Number(document.getElementById('pMarque').value) || null,
          idCategorie: Number(document.getElementById('pCat').value) || null,
          idFournisseur: Number(document.getElementById('pFour').value) || null,
          matiere: document.getElementById('pMat').value.trim() || null,
          genre: document.getElementById('pGenre').value.trim() || null,
          saison: document.getElementById('pSaison').value.trim() || null,
          prixAchat: Number(document.getElementById('pPrixA').value) || null,
          prixVente: Number(document.getElementById('pPrixV').value),
          seuilAlerte: Number(document.getElementById('pSeuil').value) || 5,
        };
        const taille = document.getElementById('vTaille').value.trim();
        const couleur = document.getElementById('vCouleur').value.trim();
        if (taille || couleur) {
          body.variantes = [{
            taille: taille || null,
            couleur: couleur || null,
            stock: Number(document.getElementById('vStock').value) || 0,
            prixVente: Number(document.getElementById('vPrixV').value) || body.prixVente,
            prixAchat: body.prixAchat,
          }];
        }
        await ProduitsAPI.create(body);
        alert('Produit créé');
      }
      renderProduits(el);
    } catch (e) {
      alert(e.message);
    }
  });

  el.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('pId').value = btn.dataset.edit;
      document.getElementById('prodFormTitle').textContent = 'Modifier le produit';
      document.getElementById('pRef').value = btn.dataset.ref || '';
      document.getElementById('pRef').disabled = true;
      document.getElementById('pNom').value = btn.dataset.nom || '';
      document.getElementById('pDesc').value = btn.dataset.desc || '';
      document.getElementById('pPrixV').value = btn.dataset.pv || '';
      document.getElementById('pPrixA').value = btn.dataset.pa || '';
      document.getElementById('pSeuil').value = btn.dataset.seuil || '5';
      document.getElementById('pMat').value = btn.dataset.mat || '';
      document.getElementById('pGenre').value = btn.dataset.genre || '';
      document.getElementById('pSaison').value = btn.dataset.saison || '';
      document.getElementById('varCreateBlock').style.display = 'none';
      document.getElementById('prodFormPanel').style.display = 'block';
      document.getElementById('varFormPanel').style.display = 'none';
      document.getElementById('prodFormPanel').scrollIntoView({ behavior: 'smooth' });
    });
  });

  el.querySelectorAll('[data-var]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('varProdId').value = btn.dataset.var;
      document.getElementById('varProdName').textContent = btn.dataset.nom || '';
      document.getElementById('varFormPanel').style.display = 'block';
      document.getElementById('prodFormPanel').style.display = 'none';
      document.getElementById('varFormPanel').scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.getElementById('btnCancelVar')?.addEventListener('click', () => {
    document.getElementById('varFormPanel').style.display = 'none';
  });

  document.getElementById('btnSaveVar')?.addEventListener('click', async () => {
    try {
      const id = document.getElementById('varProdId').value;
      await ProduitsAPI.creerVariante(id, {
        taille: document.getElementById('nvTaille').value.trim() || null,
        couleur: document.getElementById('nvCouleur').value.trim() || null,
        stock: Number(document.getElementById('nvStock').value) || 0,
        prixVente: Number(document.getElementById('nvPrixV').value) || null,
        prixAchat: Number(document.getElementById('nvPrixA').value) || null,
        seuilAlerte: Number(document.getElementById('nvSeuil').value) || 5,
      });
      alert('Variante ajoutée');
      renderProduits(el);
    } catch (e) {
      alert(e.message);
    }
  });
}
