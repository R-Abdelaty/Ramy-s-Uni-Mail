// The recording demo uses system fonts and makes no external resource requests.
const EMAIL_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'"
const MESSAGE_COLORS = ['#153A75']

export function emailTitle(email) {
  const title = typeof email.title === 'string' ? email.title : ''
  return title.replace(/\[EXTERNAL\s+EMAIL\]\s*[-–—]\s*Notification\s+System:\s*/gi, '').trim() || 'Untitled message'
}

export function senderName(email) {
  for (const value of [email.sender_name, email.sender, email.from]) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function initials(email) {
  const name = senderName(email)
  const words = (name || emailTitle(email)).trim().split(/\s+/u)
  return words.slice(0, 2).map((word) => Array.from(word)[0]).join('').toLocaleUpperCase()
}

export function messageColor(email) {
  const value = senderName(email) || email.title
  let hash = 0
  for (const character of value || '') hash = (hash * 31 + character.codePointAt(0)) >>> 0
  return MESSAGE_COLORS[hash % MESSAGE_COLORS.length]
}

export function language(value = '') {
  if (typeof value !== 'string') return 'en'
  const arabic = (value.match(/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/gu) || []).length
  const latin = (value.match(/[a-z]/giu) || []).length
  return arabic > latin ? 'ar' : 'en'
}

export function emailDocument(email) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${EMAIL_CSP}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    :root{color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;color:#36363B;background:transparent}
    *{box-sizing:border-box;font-family:inherit!important;color:inherit!important;background-color:transparent!important}
    html,body{margin:0;padding:0;color:#36363B!important;background:transparent!important}
    body{font-size:16px;line-height:1.8;overflow-wrap:anywhere;padding:4px 5px 24px 0}
    :lang(ar){line-height:1.95}
    p{margin:0 0 1.35em}img{max-width:100%;height:auto}table{max-width:100%!important}pre{white-space:pre-wrap;overflow-wrap:anywhere}
    a{color:#153A75!important;text-decoration:underline;text-underline-offset:3px}blockquote{border-inline-start:2px solid #895B8A;padding-inline-start:16px;margin-inline:0}
    .course-code{color:#EAF4FC!important;background:#895B8A!important;border-radius:4px;cursor:help}
    .search-highlight{color:#EAF4FC!important;background:#895B8A!important;outline:1px solid #153A75;border-radius:3px;-webkit-box-decoration-break:clone;box-decoration-break:clone;pointer-events:none}
    .course-code:focus-visible{outline:2px solid #153A75;outline-offset:2px}
    ::selection{color:#EAF4FC!important;background:#153A75!important}
    ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#153A75;border-radius:6px}
  </style></head><body dir="auto">${email.html_body}</body></html>`
}
