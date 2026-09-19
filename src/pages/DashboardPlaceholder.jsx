import { Link } from 'react-router-dom'
import { dashboardText } from '../lib/dashboardText'
import './Dashboard.css'

export default function DashboardPlaceholder({ section, lang }) {
  const text = dashboardText[lang]
  return (
    <main className="dashboard-page dashboard-placeholder">
      <section className="dashboard-glass" aria-labelledby="placeholder-title">
        <p className="dashboard-note">{text.preparing}</p>
        <h1 id="placeholder-title">{text[section]}</h1>
        <p className="dashboard-copy">{text.preparingNote}</p>
        <Link className="dashboard-action" to="/app">← {text.back}</Link>
      </section>
    </main>
  )
}
