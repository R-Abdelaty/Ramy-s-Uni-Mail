import { senderName } from './mailPresentation.js'

const BLOCKS = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BODY', 'BR', 'DD', 'DIV', 'DL', 'DT', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'LI', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TH', 'TR', 'UL'])
const SKIP = new Set(['HEAD', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH', 'TEXTAREA', 'TITLE'])
const compact = value => value.replace(/\s+/gu, ' ').trim()
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Work with text nodes only: attributes, URLs, CSS, and hidden preheaders are not email content.
function textGroups(root) {
  const groups = []
  let group = []
  const flush = () => { if (group.length) groups.push(group); group = [] }
  const walk = node => {
    if (node.nodeType === 3) { if (node.textContent) group.push(node); return }
    if (node.nodeType !== 1 && node.nodeType !== 11) return
    if (node.nodeType === 1 && (SKIP.has(node.tagName) || node.hidden
      || node.getAttribute('aria-hidden') === 'true' || node.style.display === 'none'
      || node.style.visibility === 'hidden' || node.style.visibility === 'collapse')) return
    const block = BLOCKS.has(node.tagName)
    if (block) flush()
    for (const child of node.childNodes) walk(child)
    if (block) flush()
  }
  walk(root)
  flush()
  return groups
}

export function readableHtmlText(html, document = globalThis.document) {
  // Template contents stay inert; indexing never loads email images or runs email scripts.
  const template = document.createElement('template')
  template.innerHTML = html
  return compact(textGroups(template.content).map(nodes => nodes.map(node => node.textContent).join('')).join(' '))
}

export function parseSearchTerms(query, mappings = {}) {
  const words = query.trim().split(/\s+/u).filter(Boolean)
  const terms = []
  for (let index = 0; index < words.length; index++) {
    let term = words[index]
    if (words[index + 1] && Object.hasOwn(mappings, `${term}${words[index + 1]}`.toUpperCase())) term += words[++index]
    terms.push(term.toLowerCase())
  }
  return [...new Set(terms)]
}

function pattern(term) {
  const code = term.match(/^([a-z]+)(\d+)$/iu)
  const literal = code ? `${escape(code[1])}\\s*${code[2]}` : escape(term)
  return new RegExp(`(^|[^\\p{L}\\p{N}\\p{M}_])(${literal})(?![\\p{L}\\p{N}\\p{M}_])`, 'giu')
}

export function findSearchMatches(value, terms) {
  if (typeof value !== 'string') return []
  const matches = terms.flatMap(term => [...value.matchAll(pattern(term))].map(match => ({
    start: match.index + match[1].length,
    end: match.index + match[0].length,
  }))).sort((left, right) => left.start - right.start || right.end - left.end)
  const merged = []
  for (const match of matches) {
    const previous = merged.at(-1)
    if (previous && match.start < previous.end) previous.end = Math.max(previous.end, match.end)
    else merged.push({ ...match })
  }
  return merged
}

export function buildSearchIndex(emails) {
  return emails.map((email, index) => {
    const body = email.html_body ? readableHtmlText(email.html_body) : compact(typeof email.body === 'string' ? email.body : '')
    return { email, index, title: email.title || '', sender: senderName(email),
      recipient: typeof email.to === 'string' ? email.to : '', body,
      snippet: searchSnippet(compact((typeof email.preview === 'string' && email.preview) || body || 'Open to read this message.'), []) }
  })
}

export function searchSnippet(value, terms, limit = 150) {
  const match = findSearchMatches(value, terms)[0]
  let start = match ? Math.max(0, match.start - 45) : 0
  if (start) {
    const space = value.indexOf(' ', start)
    if (space !== -1 && space < match.start) start = space + 1
  }
  let end = Math.min(value.length, Math.max(start + limit, match?.end || 0))
  if (end < value.length) {
    const space = value.lastIndexOf(' ', end)
    if (space > (match?.end || start)) end = space
  }
  return `${start ? '…' : ''}${value.slice(start, end)}${end < value.length ? '…' : ''}`
}

export function searchEmails(entries, terms) {
  if (!terms.length) return entries
  const expressions = terms.map(pattern)
  return entries.flatMap(entry => {
    const fields = [entry.title, entry.sender, entry.recipient, entry.body]
    const hits = expressions.map(expression => fields.map(value => {
      expression.lastIndex = 0
      return expression.test(value)
    }))
    if (!hits.every(fields => fields.some(Boolean))) return []
    const score = hits.reduce((sum, fields) => sum + (fields[0] ? 8 : fields[1] ? 4 : fields[2] ? 2 : 1), 0)
    const snippet = hits.some(fields => fields[3]) ? searchSnippet(entry.body, terms)
      : hits.some(fields => fields[1]) ? `From: ${entry.sender}`
        : hits.some(fields => fields[2]) ? `To: ${entry.recipient}` : searchSnippet(entry.body || entry.snippet, [])
    return [{ ...entry, snippet, score }]
  }).sort((left, right) => right.score - left.score || left.index - right.index)
}

export function highlightSearchDocument(document, terms) {
  for (const nodes of textGroups(document.body)) {
    const value = nodes.map(node => node.textContent).join('')
    const offsets = []
    let length = 0
    for (const node of nodes) { offsets.push(length); length += node.textContent.length }
    for (const match of findSearchMatches(value, terms).reverse()) {
      for (let index = nodes.length - 1; index >= 0; index--) {
        const node = nodes[index]
        const start = Math.max(0, match.start - offsets[index])
        const end = Math.min(node.textContent.length, match.end - offsets[index])
        if (start >= end) continue
        const range = document.createRange()
        range.setStart(node, start)
        range.setEnd(node, end)
        const marker = document.createElement('mark')
        marker.className = 'search-highlight'
        range.surroundContents(marker)
      }
    }
  }
}
