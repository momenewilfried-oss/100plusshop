async function renderJournal(el, page = 1) {
  const pageSize = (typeof PAGE_SIZE !== 'undefined' ? PAGE_SIZE : 15);
  el.innerHTML = '<div class="loading-state">Chargement du journal…</div>';

  let logs = [];
  try {
    logs = await AuditAPI.list({ page, limit: pageSize });
    if (!Array.isArray(logs)) logs = [];
  } catch (e) {
    el.innerHTML = `<div class="error-box">${escapeHtml(e.message)}</div>`;
    return;
  }

  function fmtJson(v) {
    if (v == null) return '—';
    try {
      const o = typeof v === 'string' ? JSON.parse(v) : v;
      return escapeHtml(JSON.stringify(o, null, 0));
    } catch {
      return escapeHtml(String(v));
    }
  }

  const hasPrev = page > 1;
  const hasNext = logs.length >= pageSize;
  const from = logs.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = (page - 1) * pageSize + logs.length;

  const pagHtml = `
    <div class="pagination" id="journalPagination">
      <span class="pagination-info">${from}–${to}${hasNext ? '+' : ''} (page ${page})</span>
      <div class="pagination-controls">
        <button type="button" class="btn btn-sm" data-page-dir="prev" ${hasPrev ? '' : 'disabled'}>‹ Préc.</button>
        <span class="pagination-pages">Page ${page}</span>
        <button type="button" class="btn btn-sm" data-page-dir="next" ${hasNext ? '' : 'disabled'}>Suiv. ›</button>
      </div>
    </div>`;

  el.innerHTML = `
    <div class="panel">
      <div class="panel-title">Journal d'activité</div>
      <p style="font-size:13px;opacity:.8;margin-bottom:12px">
        Trace des actions importantes (connexion, créations, modifications, suppressions…).
      </p>
      ${logs.length === 0
        ? '<div class="empty">Aucune entrée d\'audit</div>'
        : `<div style="overflow:auto">
            <table class="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Avant</th>
                  <th>Après</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map((l) => `
                  <tr>
                    <td>${l.created_at ? new Date(l.created_at).toLocaleString('fr-FR') : '—'}</td>
                    <td>${escapeHtml(
                      ((l.user_prenom || '') + ' ' + (l.user_nom || '')).trim() ||
                      l.user_email ||
                      (l.user_id != null ? '#' + l.user_id : '—')
                    )}</td>
                    <td><span class="badge gray">${escapeHtml(l.module_name || '—')}</span></td>
                    <td><strong>${escapeHtml(l.action || '—')}</strong></td>
                    <td style="max-width:220px;font-size:12px;word-break:break-all">${fmtJson(l.old_value)}</td>
                    <td style="max-width:220px;font-size:12px;word-break:break-all">${fmtJson(l.new_value)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          ${pagHtml}`}
    </div>`;

  el.querySelector('[data-page-dir="prev"]')?.addEventListener('click', () => {
    if (page > 1) renderJournal(el, page - 1);
  });
  el.querySelector('[data-page-dir="next"]')?.addEventListener('click', () => {
    if (hasNext) renderJournal(el, page + 1);
  });
}