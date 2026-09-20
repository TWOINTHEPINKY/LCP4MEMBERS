import { Link } from 'react-router-dom'
import { dashboardText } from '../lib/dashboardText'

export default function InternalPageTitle({ id, lang, children }) {
  const back = dashboardText[lang].back
  return (
    <div className="internal-page-title">
      <Link to="/app" className="internal-back" aria-label={back} title={back}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5m6-6-6 6 6 6" />
        </svg>
      </Link>
      <h1 id={id} className="dashboard-title">{children}</h1>
    </div>
  )
}
