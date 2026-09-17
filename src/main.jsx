import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* ДОБАВЛЕН basename="/LCP4MEMBERS" */}
    <BrowserRouter basename="/LCP4MEMBERS">
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)