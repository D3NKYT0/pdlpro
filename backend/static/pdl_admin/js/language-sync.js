/**
 * Keep Django admin/docs language (django_language cookie) aligned with the SPA
 * preference in localStorage (`pdl.language`: pt|en|es).
 */
(function (global) {
  var STORAGE_KEY = 'pdl.language'
  var COOKIE_NAME = 'django_language'
  var PRODUCT_TO_DJANGO = { pt: 'pt-br', en: 'en', es: 'es' }
  var DJANGO_TO_PRODUCT = { 'pt-br': 'pt', pt: 'pt', en: 'en', es: 'es' }

  function toProduct(code) {
    if (!code) return null
    var normalized = String(code).trim().toLowerCase().replace('_', '-')
    if (DJANGO_TO_PRODUCT[normalized]) return DJANGO_TO_PRODUCT[normalized]
    if (normalized.indexOf('pt') === 0) return 'pt'
    if (normalized.indexOf('en') === 0) return 'en'
    if (normalized.indexOf('es') === 0) return 'es'
    return null
  }

  function toDjango(product) {
    return PRODUCT_TO_DJANGO[product] || 'pt-br'
  }

  function persistProduct(product) {
    if (!product) return
    try {
      localStorage.setItem(STORAGE_KEY, product)
    } catch (err) {
      /* private mode */
    }
  }

  function persistDjangoCookie(product) {
    if (!product || typeof document === 'undefined') return
    var value = encodeURIComponent(toDjango(product))
    document.cookie =
      COOKIE_NAME + '=' + value + '; path=/; max-age=31536000; SameSite=Lax'
  }

  function syncFromDjango(djangoCode) {
    var product = toProduct(djangoCode)
    if (!product) return null
    persistProduct(product)
    persistDjangoCookie(product)
    return product
  }

  function readDjangoCookie() {
    if (typeof document === 'undefined') return null
    var parts = String(document.cookie || '').split(';')
    for (var i = 0; i < parts.length; i += 1) {
      var part = parts[i].trim()
      if (part.indexOf(COOKIE_NAME + '=') === 0) {
        return decodeURIComponent(part.slice(COOKIE_NAME.length + 1))
      }
    }
    return null
  }

  function syncCookieToStorage() {
    return syncFromDjango(readDjangoCookie())
  }

  function bindSetLanguageForms(root) {
    var scope = root || document
    var forms = scope.querySelectorAll(
      'form[data-pdl-language-form], form[action*="/i18n/setlang"]',
    )
    forms.forEach(function (form) {
      if (form.getAttribute('data-pdl-language-bound') === '1') return
      form.setAttribute('data-pdl-language-bound', '1')

      form.querySelectorAll('button[name="language"]').forEach(function (button) {
        button.addEventListener('click', function () {
          syncFromDjango(button.value)
        })
      })

      form.addEventListener('submit', function () {
        var select = form.querySelector('select[name="language"]')
        if (select && select.value) {
          syncFromDjango(select.value)
        }
      })

      var select = form.querySelector('select[name="language"]')
      if (select) {
        select.addEventListener('change', function () {
          syncFromDjango(select.value)
          if (form.getAttribute('data-pdl-language-autosubmit') === '1') {
            form.submit()
          }
        })
      }
    })
  }

  global.PDLLanguage = {
    STORAGE_KEY: STORAGE_KEY,
    COOKIE_NAME: COOKIE_NAME,
    toProduct: toProduct,
    toDjango: toDjango,
    persistProduct: persistProduct,
    persistDjangoCookie: persistDjangoCookie,
    syncFromDjango: syncFromDjango,
    syncCookieToStorage: syncCookieToStorage,
    bindSetLanguageForms: bindSetLanguageForms,
  }

  if (typeof document !== 'undefined') {
    syncCookieToStorage()
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        bindSetLanguageForms()
      })
    } else {
      bindSetLanguageForms()
    }
  }
})(typeof window !== 'undefined' ? window : this)
