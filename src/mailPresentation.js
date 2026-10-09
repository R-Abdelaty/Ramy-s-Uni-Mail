// Only the requested font providers can load remotely; email resources stay blocked.
const EMAIL_CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src data: https://fonts.gstatic.com; base-uri 'none'; form-action 'none'; frame-src 'none'; object-src 'none'"
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400;1,700&family=Cairo:wght@200..1000&display=swap'
const MESSAGE_COLORS = ['#a9c7c1', '#ddc99f', '#a7c4cf', '#c5d2bd', '#d9d8bd', '#c9b27f']

export function senderName(email) {
  for (const value of [email.sender_name, email.sender, email.from]) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function initials(email) {
  const name = senderName(email)
  const words = (name || email.title || 'Untitled message').trim().split(/\s+/u)
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
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${EMAIL_CSP}"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="${FONT_URL}"><style>
    :root{color-scheme:light;font-family:"Lato","Cairo",sans-serif;color:#203f42;background:transparent}
    *{box-sizing:border-box;font-family:"Lato","Cairo",sans-serif!important;color:inherit!important;background-color:transparent!important}
    html,body{margin:0;padding:0;color:#203f42!important;background:transparent!important}
    body{font-size:16px;line-height:1.8;overflow-wrap:anywhere;padding:4px 5px 24px 0}
    :lang(ar){font-family:"Cairo","Lato",sans-serif!important;line-height:1.95}
    p{margin:0 0 1.35em}img{max-width:100%;height:auto}table{max-width:100%!important}pre{white-space:pre-wrap;overflow-wrap:anywhere}
    a{color:#255957!important;text-decoration:underline;text-underline-offset:3px}blockquote{border-inline-start:2px solid #a98743;padding-inline-start:16px;margin-inline:0}
    .course-code{color:#765b27!important;background:#a9874326!important;box-shadow:inset 0 -1px 0 #a9874399;border-radius:4px;cursor:help}
    .course-code:focus-visible{outline:2px solid #765b27;outline-offset:2px}
    ::selection{color:#eeebd3!important;background:#255957!important}
    ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#437c9080;border-radius:6px}
  </style></head><body dir="auto">${email.html_body}</body></html>`
}
