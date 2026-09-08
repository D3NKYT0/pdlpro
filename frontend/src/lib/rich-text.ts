import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
  'a', 'h2', 'h3', 'blockquote', 'code',
]
const ALLOWED_ATTR = ['href', 'title', 'rel', 'target', 'class']

/** Remove tags e deixa só o texto legível. */
export function plainTextFromRichText(html: string): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True quando não há texto útil (ex.: `<p></p>`). */
export function isRichTextEmpty(html: string): boolean {
  return !plainTextFromRichText(html)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Converte texto legado ou HTML em markup seguro para exibição. */
export function sanitizeRichText(raw: string): string {
  const value = raw ?? ''
  if (!value.trim()) return ''
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(value)
  const html = looksHtml
    ? value
    : value
      .split('\n')
      .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
      .join('')
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}
