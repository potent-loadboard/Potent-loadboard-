const message = document.createElement('div')
message.style.cssText = 'padding:24px;font-family:Arial;white-space:pre-wrap'
message.textContent = 'POTENT: Loading App.jsx...'
document.body.appendChild(message)

import('./App.jsx')
  .then(({ default: App }) => {
    message.textContent = 'POTENT: App.jsx loaded successfully.'
    
    import('react').then((React) => {
      import('react-dom/client').then(({ createRoot }) => {
        createRoot(document.getElementById('root')).render(
          React.createElement(App)
        )
      })
    })
  })
  .catch((error) => {
    message.innerHTML = `
      <h2>POTENT APP ERROR</h2>
      <pre>${error?.stack || error?.message || error}</pre>
    `
  })
