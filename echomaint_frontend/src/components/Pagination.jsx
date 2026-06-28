import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

function Pagination({ page, totalPages, total, itemsPerPage, onChange }) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  const start = (page - 1) * itemsPerPage + 1
  const end   = Math.min(page * itemsPerPage, total)

  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)

  return (
    <div className="pagination-bar">
      <p className="pagination-bar-count">
        {start}–{end} {t('pagination.of')} {total} {t('pagination.results')}
      </p>
      <div className="pagination-btns">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}>
          <i className="ti ti-chevron-left" aria-hidden="true" />
        </button>

        {/* Desktop: numéros de page avec ellipsis */}
        <div className="pagination-pages">
          {visiblePages.map((p, i, arr) => (
            <Fragment key={p}>
              {i > 0 && arr[i - 1] !== p - 1 && (
                <span className="pag-ellipsis">…</span>
              )}
              <button
                className={p === page ? 'active' : ''}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            </Fragment>
          ))}
        </div>

        {/* Mobile: "page X / N" compact */}
        <span className="pagination-mobile-label">
          {page} / {totalPages}
        </span>

        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}>
          <i className="ti ti-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default Pagination
