import { Link } from 'react-router-dom'
import { dashboardText } from '../lib/dashboardText'

export default function SupportAction({ lang }) {
  const text = dashboardText[lang]
  return <Link className="dashboard-action" to="/support">
    {text.contact}<span aria-hidden="true">↗</span>
  </Link>
}
