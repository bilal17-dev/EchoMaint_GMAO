function Pagination({ page, totalPages, total, itemsPerPage, onChange }) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * itemsPerPage + 1;
  const end   = Math.min(page * itemsPerPage, total);
  return (
    <div className="pagination-bar">
      <p>{start}–{end} sur {total} résultats</p>
      <div className="pagination-btns">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}>
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            className={p === page ? 'active' : ''}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}>
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
