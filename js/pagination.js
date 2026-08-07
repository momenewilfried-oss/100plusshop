/** Pagination côté client pour les listes historiques */
const PAGE_SIZE = 15;

function paginateSlice(items, page, pageSize = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page || 1), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  return {
    items: items.slice(startIdx, startIdx + pageSize),
    page: safePage,
    totalPages,
    total,
    pageSize,
    from: total === 0 ? 0 : startIdx + 1,
    to: Math.min(startIdx + pageSize, total),
  };
}

function paginationHtml(meta, id = 'listPagination') {
  if (meta.total === 0) return '';
  return `
    <div class="pagination" id="${id}">
      <span class="pagination-info">${meta.from}–${meta.to} sur ${meta.total}</span>
      ${meta.totalPages > 1 ? `
        <div class="pagination-controls">
          <button type="button" class="btn btn-sm" data-page-dir="prev" ${meta.page <= 1 ? 'disabled' : ''}>‹ Préc.</button>
          <span class="pagination-pages">Page ${meta.page} / ${meta.totalPages}</span>
          <button type="button" class="btn btn-sm" data-page-dir="next" ${meta.page >= meta.totalPages ? 'disabled' : ''}>Suiv. ›</button>
        </div>` : ''}
    </div>`;
}

function bindPagination(container, onChange) {
  container.querySelector('.pagination')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-page-dir]');
    if (!btn || btn.disabled) return;
    if (btn.dataset.pageDir === 'prev') onChange(-1);
    else if (btn.dataset.pageDir === 'next') onChange(1);
  });
}
