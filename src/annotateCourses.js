import { matchCourses } from './courseMappings.js'

const BLOCKS = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BODY', 'BR', 'DD', 'DIV', 'DL', 'DT', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'LI', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TH', 'TR', 'UL'])
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'MATH', 'TEXTAREA', 'TITLE'])
const originals = new WeakMap()

export function annotateCourseDocument(document, mappings) {
  const body = document.body
  if (!body) return
  if (!originals.has(body)) originals.set(body, body.innerHTML)
  else body.innerHTML = originals.get(body)
  const groups = []
  let group = []
  const flush = () => { if (group.length) groups.push(group); group = [] }
  const walk = (node) => {
    if (node.nodeType === 3) { if (node.textContent) group.push(node); return }
    if (node.nodeType !== 1 || SKIP.has(node.tagName)) return
    const block = BLOCKS.has(node.tagName)
    if (block) flush()
    for (const child of Array.from(node.childNodes)) walk(child)
    if (block) flush()
  }
  for (const child of Array.from(body.childNodes)) walk(child)
  flush()
  for (const nodes of groups) {
    const value = nodes.map((node) => node.textContent).join('')
    const offsets = []
    let length = 0
    for (const node of nodes) { offsets.push(length); length += node.textContent.length }
    for (const match of matchCourses(value, mappings).reverse()) {
      for (let index = nodes.length - 1; index >= 0; index--) {
        const node = nodes[index]
        const start = Math.max(0, match.start - offsets[index])
        const end = Math.min(node.textContent.length, match.end - offsets[index])
        if (start >= end) continue
        const range = document.createRange()
        range.setStart(node, start)
        range.setEnd(node, end)
        const marker = document.createElement('span')
        marker.className = 'course-code'
        marker.tabIndex = 0
        marker.setAttribute('role', 'button')
        marker.setAttribute('aria-label', `${match.code}: ${match.name}`)
        marker.dataset.courseCode = match.code
        range.surroundContents(marker)
      }
    }
  }
}
