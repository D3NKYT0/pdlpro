(function () {
  var labels = {
    pt: { aria: 'Carregando a aplicação', text: 'Preparando sua jornada' },
    en: { aria: 'Loading the application', text: 'Preparing your journey' },
    es: { aria: 'Cargando la aplicación', text: 'Preparando tu viaje' },
  }
  var lang = 'pt'
  try {
    var stored = localStorage.getItem('pdl.language')
    if (stored === 'en' || stored === 'es' || stored === 'pt') lang = stored
    else {
      var nav = String(navigator.language || '').toLowerCase()
      if (nav.indexOf('en') === 0) lang = 'en'
      else if (nav.indexOf('es') === 0) lang = 'es'
    }
  } catch (error) {}
  var copy = labels[lang]
  var root = document.getElementById('app-bootstrap-loader')
  if (!root || !copy) return
  root.setAttribute('aria-label', copy.aria)
  var span = root.querySelector('span')
  if (span) span.textContent = copy.text
})()
