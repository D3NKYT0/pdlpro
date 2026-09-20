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

;(function () {
  var THEME_ID = /^[a-z0-9][a-z0-9._-]{0,40}$/i
  var SYMBOL = /^\/(?:theme|media\/themes)\/[A-Za-z0-9._/-]+(?:\?[A-Za-z0-9._=-]{1,40})?$/
  var COLOR =
    /^(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(|hsla?\(|oklch\(|oklab\(|hwb\(|color\()/i

  function isColor(value) {
    if (!value || /[;{}]|url\s*\(|expression|<\/|"|'/i.test(value)) return false
    return COLOR.test(value)
  }

  function isSymbol(value) {
    return SYMBOL.test(value) && value.indexOf('..') === -1
  }

  try {
    var raw = localStorage.getItem('pdl.loaderChrome')
    if (!raw) return
    var chrome = JSON.parse(raw)
    if (!chrome || !THEME_ID.test(chrome.id) || !isSymbol(chrome.symbol)) return
    if (!isColor(chrome.accent) || !isColor(chrome.accentBright) || !isColor(chrome.background)) return
    var root = document.documentElement
    root.style.setProperty('--loader-accent', chrome.accent)
    root.style.setProperty('--loader-accent-bright', chrome.accentBright)
    root.style.setProperty('--loader-bg', chrome.background)
    root.setAttribute('data-pdl-loader-theme', chrome.id)
    var mark =
      document.querySelector('#app-bootstrap-loader .global-loader__crest img') ||
      document.querySelector('#app-bootstrap-loader img:not(.global-loader__wordmark)')
    if (mark) mark.setAttribute('src', chrome.symbol)
    var wordmark = document.querySelector('#app-bootstrap-loader .global-loader__wordmark')
    if (wordmark && chrome.logo && isSymbol(chrome.logo)) wordmark.setAttribute('src', chrome.logo)
  } catch (error) {}
})()
