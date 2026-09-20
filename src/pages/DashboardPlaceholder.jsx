import InternalPageTitle from '../components/InternalPageTitle'
import { dashboardText } from '../lib/dashboardText'
import './Dashboard.css'

export default function DashboardPlaceholder({ section, lang }) {
  const text = dashboardText[lang]
  return (
    <main className="dashboard-page dashboard-placeholder">
      <section className="dashboard-glass" aria-labelledby="placeholder-title">
        <p className="dashboard-note">{text.preparing}</p>
        <InternalPageTitle id="placeholder-title" lang={lang}>{text[section]}</InternalPageTitle>
        <p className="dashboard-copy">{text.preparingNote}</p>
      </section>
    </main>
  )
}
