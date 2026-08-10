/* Journal d'activité — pagination + auteur (v20260810e) */
async function renderJournal(el, page = 1) {
  if (!el) return;
  const pageSize = typeof PAGE_SIZE !== 'undefined' ? PAGE_SIZE : 15;
  page = Math.max(1, Number(page) || 1);

  el.innerHTML = '<div class="loading-state">Chargement du journal…</div>';

  let result = { items: [], page: 1, totalPages: 1, total: 0 };
  try {
    const data = await AuditAPI.list({ page: page, limit: pageSize });
    if (Array.isArray(data)) {
      // ancien format (tableau brut)
      result.items = data;
      result.page = page;
      result.total = data.length;
      result.totalPages = 1;
    } else {
      result.items = data.items || data.rows || [];
      result.page = Number(data.page) || page;
      result.totalPages = Number(data.totalPages) || 1;
      result.total = Number(data.total) || result.items.length;
      result.limit = data.limit;
    }
  } catch (e) {
    el.innerHTML = '<div class="error-box">' + escapeHtml(e.message || String(e)) + '</div>';
    return;
  }

  const logs = result.items;
  const hasPrev = result.page > 1;
  const hasNext = result.page < result.totalPages;
  const from = logs.length === 0 ? 0 : (result.page - 1) * pageSize + 1;
  const to = (result.page - 1) * pageSize + logs.length;

  function fmtJson(v) {
    if (v == null || v === '') return '—';
    if (typeof v === 'object') {
      try {
        return escapeHtml(JSON.stringify(v));
      } catch (e) {
        return '—';
      }
    }
    const s = String(v);
    try {
      const parsed = JSON.parse(s);
      return escapeHtml(typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
    } catch (e) {
      return escapeHtml(s);
    }
  }

  function auteur(l) {
    if (l.auteur) return escapeHtml(l.auteur);
    const name = ((l.user_prenom || '') + ' ' + (l.user_nom || '')).trim();
    if (name) return escapeHtml(name);
    if (l.user_email) return escapeHtml(l.user_email);
    if (l.user_id != null) return 'Utilisateur #' + l.user_id;
    return 'Système';
  }

  const pagHtml =
    '<div class="pagination" style="margin-top:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">' +
    '<span class="pagination-info">' +
    from +
    '–' +
    to +
    ' sur ' +
    result.total +
    '</span>' +
    '<button type="button" class="btn btn-sm" data-page-dir="prev" ' +
    (hasPrev ? '' : 'disabled') +
    '>‹ Préc.</button>' +
    '<span>Page ' +
    result.page +
    ' / ' +
    result.totalPages +
    '</span>' +
    '<button type="button" class="btn btn-sm" data-page-dir="next" ' +
    (hasNext ? '' : 'disabled') +
    '>Suiv. ›</button></div>';

  el.innerHTML =
    '<div class="panel">' +
    '<div class="panel-title">Journal d\'activité</div>' +
    '<p style="font-size:13px;opacity:.8;margin-bottom:12px">' +
    'Tous les mouvements importants de la boutique, avec l\'auteur de chaque action.' +
    '</p>' +
    (logs.length === 0
      ? '<div class="empty">Aucune entrée d\'audit</div>'
      : '<div style="overflow:auto"><table class="data"><thead><tr>' +
        '<th>Date</th><th>Auteur</th><th>Module</th><th>Action</th><th>Avant</th><th>Après</th>' +
        '</tr></thead><tbody>' +
        logs
          .map(function (l) {
            return (
              '<tr>' +
              '<td>' +
              (l.created_at ? new Date(l.created_at).toLocaleString('fr-FR') : '—') +
              '</td>' +
              '<td><strong>' +
              auteur(l) +
              '</strong></td>' +
              '<td><span class="badge gray">' +
              escapeHtml(l.module_name || '—') +
              '</span></td>' +
              '<td><strong>' +
              escapeHtml(l.action_label || l.action || '—') +
              '</strong></td>' +
              '<td style="max-width:220px;font-size:12px;word-break:break-all">' +
              fmtJson(l.old_value) +
              '</td>' +
              '<td style="max-width:220px;font-size:12px;word-break:break-all">' +
              fmtJson(l.new_value) +
              '</td>' +
              '</tr>'
            );
          })
          .join('') +
        '</tbody></table></div>' +
        pagHtml) +
    '</div>';

  el.querySelector('[data-page-dir="prev"]')?.addEventListener('click', function () {
    if (hasPrev) renderJournal(el, result.page - 1);
  });
  el.querySelector('[data-page-dir="next"]')?.addEventListener('click', function () {
    if (hasNext) renderJournal(el, result.page + 1);
  });
}
