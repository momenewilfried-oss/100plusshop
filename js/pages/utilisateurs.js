async function renderUtilisateurs(el) {
  let users = [];
  let roles = [];
  try {
    [users, roles] = await Promise.all([
      UtilisateursAPI.list(),
      UtilisateursAPI.roles(),
    ]);
  } catch (e) {
    el.innerHTML = `<div class="error-box">${e.message}<br><small>Réservé aux administrateurs. Connectez-vous avec un compte administrateur.</small></div>`;
    return;
  }

  const moi = getUser()?.id;
  const roleOptions = roles
    .map((r) => `<option value="${r.id_role}">${r.libelle}</option>`)
    .join('');

  el.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" id="btnNewUser">+ Nouvel utilisateur</button>
      <button class="btn" id="btnRefreshUsers">Actualiser</button>
    </div>

    <div class="panel" id="userCreatePanel" style="display:none">
      <div class="panel-title">Nouvel utilisateur</div>
      <div class="form-grid">
        <div><label>Nom *</label><input id="cNom" placeholder="onguene" /></div>
        <div><label>Prénom *</label><input id="cPrenom" placeholder="Marc" /></div>
        <div><label>Email *</label><input id="cEmail" type="email" placeholder="onguenemarc@gmail.com" /></div>
        <div><label>Téléphone</label><input id="cTel" placeholder="6XX XX XX XX" /></div>
        <div>
          <label>Rôle *</label>
          <select id="cRole">
            <option value="">— Choisir —</option>
            ${roleOptions}
          </select>
        </div>
        <div><label>Mot de passe * (min. 8)</label><input id="cPass" type="password" minlength="8" placeholder="••••••••" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btnCreateUser">Créer le compte</button>
        <button class="btn" id="btnCancelCreate">Annuler</button>
      </div>
    </div>

    <div class="panel" id="userEditPanel" style="display:none">
      <div class="panel-title">Modifier l'utilisateur</div>
      <input type="hidden" id="uId" />
      <div class="form-grid">
        <div><label>Nom</label><input id="uNom" /></div>
        <div><label>Prénom</label><input id="uPrenom" /></div>
        <div>
          <label>Rôle</label>
          <select id="uRole">${roleOptions}</select>
        </div>
        <div>
          <label>Statut</label>
          <select id="uStatut">
            <option value="actif">actif</option>
            <option value="inactif">inactif</option>
          </select>
        </div>
        <div><label>Téléphone</label><input id="uTel" /></div>
        <div><label>Nouveau mot de passe (optionnel)</label><input id="uPass" type="password" minlength="8" placeholder="Laisser vide pour ne pas changer" /></div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btnSaveUser">Enregistrer</button>
        <button class="btn" id="btnCancelUser">Annuler</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Utilisateurs (${users.length})</div>
      ${
        users.length === 0
          ? '<div class="empty">Aucun utilisateur</div>'
          : `<div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>ID</th><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (u) => `
              <tr>
                <td>${u.id_utilisateur}</td>
                <td><strong>${escapeHtml(u.prenom || '')} ${escapeHtml(u.nom || '')}</strong></td>
                <td>${escapeHtml(u.email || '-')}</td>
                <td><span class="badge pink">${escapeHtml(u.role || '-')}</span></td>
                <td><span class="badge ${u.statut === 'actif' ? 'green' : 'gray'}">${escapeHtml(u.statut || '-')}</span></td>
                <td>
                  <button class="btn btn-sm btn-primary"
                    data-edit="${u.id_utilisateur}"
                    data-nom="${(u.nom || '').replace(/"/g, '')}"
                    data-prenom="${(u.prenom || '').replace(/"/g, '')}"
                    data-role="${u.id_role || ''}"
                    data-statut="${u.statut || 'actif'}"
                    data-tel="${(u.telephone || '').replace(/"/g, '')}">
                    Modifier
                  </button>
                  ${
                    Number(u.id_utilisateur) === Number(moi)
                      ? ''
                      : `<button class="btn btn-sm" data-del="${u.id_utilisateur}">Supprimer</button>`
                  }
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
      }
    </div>
  `;

  document.getElementById('btnRefreshUsers')?.addEventListener('click', () =>
    renderUtilisateurs(el)
  );

  document.getElementById('btnNewUser')?.addEventListener('click', () => {
    document.getElementById('userCreatePanel').style.display = 'block';
    document.getElementById('userEditPanel').style.display = 'none';
    document.getElementById('userCreatePanel').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('btnCancelCreate')?.addEventListener('click', () => {
    document.getElementById('userCreatePanel').style.display = 'none';
  });

  document.getElementById('btnCreateUser')?.addEventListener('click', async () => {
    const nom = document.getElementById('cNom').value.trim();
    const prenom = document.getElementById('cPrenom').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    const telephone = document.getElementById('cTel').value.trim();
    const idRole = Number(document.getElementById('cRole').value);
    const motDePasse = document.getElementById('cPass').value;

    if (!nom || !prenom || !email || !idRole || !motDePasse) {
      alert('Nom, prénom, email, rôle et mot de passe sont obligatoires.');
      return;
    }
    if (motDePasse.length < 8) {
      alert('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    try {
      await UtilisateursAPI.create({
        nom,
        prenom,
        email,
        telephone: telephone || null,
        idRole,
        motDePasse,
      });
      alert('Utilisateur créé avec succès');
      renderUtilisateurs(el);
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('btnCancelUser')?.addEventListener('click', () => {
    document.getElementById('userEditPanel').style.display = 'none';
  });

  el.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('uId').value = btn.dataset.edit;
      document.getElementById('uNom').value = btn.dataset.nom || '';
      document.getElementById('uPrenom').value = btn.dataset.prenom || '';
      document.getElementById('uRole').value = btn.dataset.role || '';
      document.getElementById('uStatut').value = btn.dataset.statut || 'actif';
      document.getElementById('uTel').value = btn.dataset.tel || '';
      document.getElementById('uPass').value = '';
      document.getElementById('userEditPanel').style.display = 'block';
      document.getElementById('userCreatePanel').style.display = 'none';
      document.getElementById('userEditPanel').scrollIntoView({ behavior: 'smooth' });
    });
  });

  document.getElementById('btnSaveUser')?.addEventListener('click', async () => {
    try {
      const id = document.getElementById('uId').value;
      const body = {
        nom: document.getElementById('uNom').value.trim(),
        prenom: document.getElementById('uPrenom').value.trim(),
        idRole: Number(document.getElementById('uRole').value),
        statut: document.getElementById('uStatut').value,
        telephone: document.getElementById('uTel').value.trim() || null,
      };
      const pass = document.getElementById('uPass').value;
      if (pass) {
        if (pass.length < 8) {
          alert('Le mot de passe doit contenir au moins 8 caractères.');
          return;
        }
        body.motDePasse = pass;
      }
      await UtilisateursAPI.update(id, body);
      alert('Utilisateur mis à jour');
      renderUtilisateurs(el);
    } catch (e) {
      alert(e.message);
    }
  });

  el.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cet utilisateur ? Cette action est définitive.')) return;
      try {
        await UtilisateursAPI.remove(btn.dataset.del);
        renderUtilisateurs(el);
      } catch (e) {
        alert(e.message);
      }
    });
  });
}
