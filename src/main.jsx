import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

window.addEventListener('error', (event) => {
  document.body.innerHTML = `
    <div style="padding:24px;font-family:monospace;white-space:pre-wrap;color:#b00020">
      <h2>POTENT APP ERROR</h2>
      ${event.error?.stack || event.message || 'Unknown JavaScript error'}
    </div>
  `
})

window.addEventListener('unhandledrejection', (event) => {
  document.body.innerHTML = `
    <div style="padding:24px;font-family:monospace;white-space:pre-wrap;color:#b00020">
      <h2>POTENT APP ERROR</h2>
      ${event.reason?.stack || event.reason || 'Unknown promise error'}
    </div>
  `
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
